// Command contact is a tiny, self-hosted endpoint for the MentesIT / FreeIT
// contact form. It validates input, drops honeypot/spam, rate-limits per IP,
// and relays the message over SMTP. No third-party services, no database.
//
// Configuration is via environment variables (see README.md). Run it behind
// nginx at /api/contact (see deploy/nginx.conf.sample).
package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"sync"
	"time"
)

type config struct {
	addr       string
	path       string
	smtpHost   string
	smtpPort   string
	smtpUser   string
	smtpPass   string
	mailFrom   string
	mailTo     string
	successURL string
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func loadConfig() config {
	return config{
		addr:       env("CONTACT_ADDR", "127.0.0.1:8081"),
		path:       env("CONTACT_PATH", "/api/contact"),
		smtpHost:   env("SMTP_HOST", "127.0.0.1"),
		smtpPort:   env("SMTP_PORT", "25"),
		smtpUser:   os.Getenv("SMTP_USER"),
		smtpPass:   os.Getenv("SMTP_PASS"),
		mailFrom:   env("MAIL_FROM", "no-reply@mentesit.eu"),
		mailTo:     env("MAIL_TO", "info@mentesit.eu"),
		successURL: env("SUCCESS_URL", "https://mentesit.eu/kapcsolat/"),
	}
}

// rateLimiter is a small in-memory per-IP sliding-window limiter.
type rateLimiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
	max  int
	win  time.Duration
}

func newRateLimiter(max int, win time.Duration) *rateLimiter {
	return &rateLimiter{hits: map[string][]time.Time{}, max: max, win: win}
}

func (l *rateLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := time.Now().Add(-l.win)
	kept := l.hits[ip][:0]
	for _, t := range l.hits[ip] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.max {
		l.hits[ip] = kept
		return false
	}
	l.hits[ip] = append(kept, time.Now())
	return true
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// stripCRLF removes CR/LF so user input cannot inject extra mail headers.
func stripCRLF(s string) string {
	return strings.TrimSpace(strings.NewReplacer("\r", " ", "\n", " ").Replace(s))
}

func mimeEncode(s string) string {
	return "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(s)) + "?="
}

type handler struct {
	cfg config
	rl  *rateLimiter
}

func (h handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	wantsJSON := strings.Contains(r.Header.Get("Accept"), "application/json") ||
		r.Header.Get("X-Requested-With") == "fetch"

	respond := func(ok bool, code int, msg string) {
		if wantsJSON {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(code)
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": ok, "message": msg})
			return
		}
		if ok {
			http.Redirect(w, r, h.cfg.successURL, http.StatusSeeOther)
			return
		}
		http.Error(w, msg, code)
	}

	if err := r.ParseForm(); err != nil {
		respond(false, http.StatusBadRequest, "invalid form")
		return
	}

	// Honeypot: a real user never fills this. Pretend success, send nothing.
	if strings.TrimSpace(r.PostFormValue("company_url")) != "" {
		respond(true, http.StatusOK, "ok")
		return
	}

	if !h.rl.allow(clientIP(r)) {
		respond(false, http.StatusTooManyRequests, "too many requests")
		return
	}

	name := stripCRLF(r.PostFormValue("name"))
	email := stripCRLF(r.PostFormValue("email"))
	lang := stripCRLF(r.PostFormValue("lang"))
	message := strings.TrimSpace(r.PostFormValue("message"))

	if name == "" || email == "" || message == "" ||
		len(name) > 200 || len(email) > 200 || len(message) > 5000 ||
		!strings.Contains(email, "@") || strings.ContainsAny(email, " \t") {
		respond(false, http.StatusBadRequest, "missing or invalid fields")
		return
	}

	subject := fmt.Sprintf("[mentesit.eu/%s] Új üzenet: %s", lang, name)
	body := fmt.Sprintf("Név:   %s\nEmail: %s\nNyelv: %s\n\n%s\n", name, email, lang, message)

	if err := h.send(email, subject, body); err != nil {
		log.Printf("send error from %s: %v", clientIP(r), err)
		respond(false, http.StatusBadGateway, "could not send message")
		return
	}
	log.Printf("message relayed from %s <%s>", name, email)
	respond(true, http.StatusOK, "sent")
}

func (h handler) send(replyTo, subject, body string) error {
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\n", h.cfg.mailFrom)
	fmt.Fprintf(&b, "To: %s\r\n", h.cfg.mailTo)
	fmt.Fprintf(&b, "Reply-To: %s\r\n", stripCRLF(replyTo))
	fmt.Fprintf(&b, "Subject: %s\r\n", mimeEncode(subject))
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	b.WriteString(body)

	addr := net.JoinHostPort(h.cfg.smtpHost, h.cfg.smtpPort)
	var auth smtp.Auth
	if h.cfg.smtpUser != "" {
		auth = smtp.PlainAuth("", h.cfg.smtpUser, h.cfg.smtpPass, h.cfg.smtpHost)
	}
	return smtp.SendMail(addr, auth, h.cfg.mailFrom, []string{h.cfg.mailTo}, []byte(b.String()))
}

func main() {
	cfg := loadConfig()
	h := handler{cfg: cfg, rl: newRateLimiter(5, 10*time.Minute)}

	mux := http.NewServeMux()
	mux.Handle(cfg.path, h)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintln(w, "ok")
	})

	srv := &http.Server{
		Addr:              cfg.addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
	}
	log.Printf("contact service listening on %s (path %s)", cfg.addr, cfg.path)
	log.Fatal(srv.ListenAndServe())
}
