package main

import (
	"net/http"
	"strconv"
	"testing"
	"time"
)

func newH(trusted string) handler {
	return handler{proxies: parseProxies(trusted)}
}

func req(remoteAddr, xff string) *http.Request {
	r := &http.Request{RemoteAddr: remoteAddr, Header: http.Header{}}
	if xff != "" {
		r.Header.Set("X-Forwarded-For", xff)
	}
	return r
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name    string
		trusted string
		remote  string
		xff     string
		want    string
	}{
		{"direct peer, no xff", "127.0.0.0/8,::1/128", "203.0.113.7:5000", "", "203.0.113.7"},
		{"untrusted peer xff ignored (spoof)", "127.0.0.0/8", "203.0.113.7:5000", "9.9.9.9", "203.0.113.7"},
		{"host nginx loopback -> real client", "127.0.0.0/8,::1/128", "127.0.0.1:40000", "203.0.113.7", "203.0.113.7"},
		{"spoofed left entry defeated", "127.0.0.0/8", "127.0.0.1:40000", "6.6.6.6, 203.0.113.7", "203.0.113.7"},
		{"docker proxy -> real client", "172.28.0.0/16", "172.28.0.5:33000", "203.0.113.7", "203.0.113.7"},
		{"multi-hop skips trusted, keeps client", "172.28.0.0/16,10.0.0.0/8", "172.28.0.5:33000", "203.0.113.7, 10.0.0.2", "203.0.113.7"},
		{"all-trusted xff falls back to peer", "127.0.0.0/8", "127.0.0.1:40000", "127.0.0.5", "127.0.0.1"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := newH(c.trusted).clientIP(req(c.remote, c.xff))
			if got != c.want {
				t.Fatalf("clientIP=%q want %q", got, c.want)
			}
		})
	}
}

// A spoofed XFF must not let one caller exhaust another caller's rate budget:
// from an untrusted direct peer the header is ignored, so all spoof attempts
// collapse to the same (real) peer key and get limited together.
func TestRateLimitNotBypassedBySpoof(t *testing.T) {
	h := handler{proxies: parseProxies("127.0.0.0/8"), rl: newRateLimiter(3, time.Hour)}
	allowed := 0
	for i := 0; i < 10; i++ {
		// untrusted peer rotating a fake XFF each time
		if h.rl.allow(h.clientIP(req("203.0.113.7:5000", "1.2.3."+strconv.Itoa(i)))) {
			allowed++
		}
	}
	if allowed != 3 {
		t.Fatalf("spoofed XFF bypassed limiter: allowed=%d want 3", allowed)
	}
}
