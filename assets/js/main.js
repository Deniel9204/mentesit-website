// MentesIT / FreeIT — progressive enhancement entry point.
// Keep this tiny. The site is fully usable with JS disabled.

// Signal JS availability to CSS.
document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

// Live section ledger (scroll-spy): highlights the current section in the
// gutter rail. Pure active-state toggling — no animation. Degrades to a plain
// in-page table of contents with JS off.
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
    if (a) {
      a.classList.add("is-current");
      a.setAttribute("aria-current", "true");
    }
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
