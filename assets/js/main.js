// MentesIT / FreeIT — progressive enhancement entry point.
// Keep this tiny. The site is fully usable with JS disabled.

// Signal JS availability to CSS.
document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

// ---------------------------------------------------------------------------
// Typed boot hero. The lines are decorative (aria-hidden) and already present
// in the DOM, so this only animates their reveal. Respects reduced-motion and
// no-JS (lines just show statically).
// ---------------------------------------------------------------------------
(function () {
  var host = document.querySelector("[data-typed]");
  if (!host) return;
  var lines = Array.prototype.slice.call(host.querySelectorAll(".boot-line"));
  if (!lines.length) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { host.classList.add("typed-done"); return; }

  lines.forEach(function (line) { line.dataset.full = line.textContent; line.textContent = ""; });
  host.classList.add("typing");

  var li = 0;
  function typeLine() {
    if (li >= lines.length) {
      host.classList.remove("typing");
      host.classList.add("typed-done");
      return;
    }
    var line = lines[li], full = line.dataset.full, ci = 0;
    line.classList.add("typing-active");
    (function tick() {
      line.textContent = full.slice(0, ci);
      if (ci < full.length) { ci++; setTimeout(tick, 26); }
      else { line.classList.remove("typing-active"); li++; setTimeout(typeLine, 180); }
    })();
  }
  typeLine();
})();

// ---------------------------------------------------------------------------
// Live section ledger (scroll-spy): highlights the current section in the
// gutter rail. Pure active-state toggling. Degrades to a plain in-page table
// of contents with JS off.
// ---------------------------------------------------------------------------
(function () {
  var links = document.querySelectorAll(".ledger a[href^='#']");
  if (!links.length || !("IntersectionObserver" in window)) return;

  var byId = {};
  links.forEach(function (a) {
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (el) byId[el.id] = a;
  });

  function setCurrent(id) {
    links.forEach(function (a) {
      a.classList.remove("is-current");
      a.removeAttribute("aria-current");
    });
    var a = byId[id];
    if (a) { a.classList.add("is-current"); a.setAttribute("aria-current", "true"); }
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) setCurrent(entry.target.id);
    });
  }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });

  Object.keys(byId).forEach(function (id) {
    observer.observe(document.getElementById(id));
  });
})();

// Roadmap (M5): command palette ("/" and Cmd/Ctrl-K), scroll reveals.
