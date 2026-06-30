// MentesIT / FreeIT — progressive enhancement entry point.
// Keep this lean. The site is fully usable with JS disabled.

document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Run each enhancement in isolation so one failing can never block the others
// (in particular, never leave reveal-hidden content stuck invisible).
function safe(fn) { try { fn(); } catch (e) { /* fail soft */ } }

// 1) Scroll reveals — FIRST, so a later error can't strand hidden content.
safe(function () {
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  var els = document.querySelectorAll(".site-main > section, .site-main > article");
  if (!els.length) return;
  // Hiding CSS keys off .reveal-ready, added only now that we will reveal.
  document.documentElement.classList.add("reveal-ready");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
  els.forEach(function (el) { io.observe(el); });
});

// 2) Typed boot hero (decorative, aria-hidden).
safe(function () {
  var host = document.querySelector("[data-typed]");
  if (!host) return;
  var lines = Array.prototype.slice.call(host.querySelectorAll(".boot-line"));
  if (!lines.length) return;
  if (reduceMotion) { host.classList.add("typed-done"); return; }
  lines.forEach(function (line) { line.dataset.full = line.textContent; line.textContent = ""; });
  host.classList.add("typing");
  var li = 0;
  (function typeLine() {
    if (li >= lines.length) { host.classList.remove("typing"); host.classList.add("typed-done"); return; }
    var line = lines[li], full = line.dataset.full, ci = 0;
    line.classList.add("typing-active");
    (function tick() {
      line.textContent = full.slice(0, ci);
      if (ci < full.length) { ci++; setTimeout(tick, 26); }
      else { line.classList.remove("typing-active"); li++; setTimeout(typeLine, 180); }
    })();
  })();
});

// 3) Command palette ("/" or Cmd/Ctrl-K) — built from the server-rendered menu.
safe(function () {
  var dlg = document.getElementById("cmdk");
  if (!dlg || typeof dlg.showModal !== "function") return; // no <dialog>: nav still works
  var input = document.getElementById("cmdk-input");
  var list = document.getElementById("cmdk-list");
  var empty = dlg.querySelector(".cmdk-empty");
  var opts = Array.prototype.slice.call(list.querySelectorAll(".cmdk-opt"));
  var active = -1;

  function visible() { return opts.filter(function (o) { return !o.hidden; }); }
  function setActive(i) {
    var vis = visible();
    opts.forEach(function (o) { o.classList.remove("is-active"); });
    if (!vis.length) { active = -1; input.removeAttribute("aria-activedescendant"); return; }
    active = (i + vis.length) % vis.length;
    var el = vis[active];
    el.classList.add("is-active");
    input.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  }
  function filter() {
    var q = input.value.trim().toLowerCase();
    opts.forEach(function (o) { o.hidden = !!q && o.dataset.label.indexOf(q) === -1; });
    empty.hidden = visible().length > 0;
    setActive(0);
  }
  function go() {
    var vis = visible();
    var el = (active >= 0 && vis[active]) ? vis[active] : vis[0];
    if (el) window.location.href = el.dataset.href;
  }
  function open() {
    if (dlg.open) return;
    input.value = ""; filter();
    dlg.showModal(); input.focus();
  }

  input.addEventListener("input", filter);
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); go(); }
  });
  opts.forEach(function (o) {
    o.addEventListener("click", function () { window.location.href = o.dataset.href; });
    o.addEventListener("mousemove", function () { var idx = visible().indexOf(o); if (idx > -1) setActive(idx); });
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
    else if (e.key === "/" && !typing && !dlg.open) { e.preventDefault(); open(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-cmdk-open]"), function (btn) {
    btn.hidden = false; // reveal triggers only when the palette is functional
    btn.addEventListener("click", function (e) { e.preventDefault(); open(); });
  });
});

// 4) Contact form — solve the ALTCHA proof-of-work, then fetch submit with
//    inline status. Self-hosted captcha, no third party. No-JS visitors use the
//    email address shown alongside the form.
safe(function () {
  var form = document.querySelector("[data-contact-form]");
  if (!form) return;
  var status = form.querySelector(".form-status");
  var btn = form.querySelector("button[type=submit]");
  var altchaInput = form.querySelector("input[name=altcha]");
  var challengeURL = form.getAttribute("data-altcha-url");

  function show(msg, ok) {
    if (!status) return;
    status.textContent = msg;
    status.className = "form-status " + (ok ? "is-ok" : "is-err");
    status.hidden = false;
  }
  function note(msg) {
    if (!status || !msg) return;
    status.textContent = msg;
    status.className = "form-status";
    status.hidden = false;
  }
  function toHex(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
    return s;
  }

  // Fetch a fresh challenge and brute-force the number whose SHA-256 matches.
  // Returns the base64 ALTCHA payload, or null if captcha can't run (the server
  // then rejects, and the user falls back to email).
  function solveCaptcha() {
    if (!altchaInput || !challengeURL || !(window.crypto && crypto.subtle)) {
      return Promise.resolve(null);
    }
    return fetch(challengeURL, { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(async function (c) {
        var enc = new TextEncoder();
        for (var n = 0; n <= c.maxnumber; n++) {
          var buf = await crypto.subtle.digest("SHA-256", enc.encode(c.salt + n));
          if (toHex(buf) === c.challenge) {
            return btoa(JSON.stringify({
              algorithm: c.algorithm, challenge: c.challenge,
              number: n, salt: c.salt, signature: c.signature
            }));
          }
        }
        return null;
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (status) { status.hidden = true; status.className = "form-status"; }
    if (btn) btn.disabled = true;
    note(form.dataset.verifying);
    solveCaptcha()
      .then(function (payload) {
        if (altchaInput) altchaInput.value = payload || "";
        return fetch(form.action, {
          method: "POST",
          headers: { "Accept": "application/json", "X-Requested-With": "fetch" },
          // URLSearchParams -> application/x-www-form-urlencoded (no file fields).
          body: new URLSearchParams(new FormData(form))
        });
      })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (data) {
        if (data && data.ok) { form.reset(); show(form.dataset.success || "OK", true); }
        else { show(form.dataset.error || "Error", false); }
      })
      .catch(function () { show(form.dataset.error || "Error", false); })
      // Clear the one-time solution so each attempt solves a fresh challenge.
      .then(function () { if (btn) btn.disabled = false; if (altchaInput) altchaInput.value = ""; });
  });
});

// 5) Live section ledger (scroll-spy) in the gutter rail.
safe(function () {
  var links = document.querySelectorAll(".ledger a[href^='#']");
  if (!links.length || !("IntersectionObserver" in window)) return;
  var byId = {};
  Array.prototype.forEach.call(links, function (a) {
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (el) byId[el.id] = a;
  });
  function setCurrent(id) {
    Array.prototype.forEach.call(links, function (a) { a.classList.remove("is-current"); a.removeAttribute("aria-current"); });
    var a = byId[id];
    if (a) { a.classList.add("is-current"); a.setAttribute("aria-current", "true"); }
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) setCurrent(e.target.id); });
  }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
  Object.keys(byId).forEach(function (id) { io.observe(document.getElementById(id)); });
});
