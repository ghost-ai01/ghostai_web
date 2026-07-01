/* Ghost.AI landing — progressive enhancement only. Page works fully without JS. */
(function () {
  "use strict";

  /* Sticky header shadow on scroll */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Reveal-on-scroll via IntersectionObserver (graceful fallback: show all) */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && items.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* Single-source-of-truth sync: if links.json is reachable (served over http),
     keep all external links in lockstep with the file. Hardcoded HTML hrefs are
     the fallback so the page also works when opened directly as file://. */
  if (location.protocol === "http:" || location.protocol === "https:") {
    fetch("links.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (data.blog_url) {
          document.querySelectorAll("[data-link='blog']").forEach(function (a) { a.href = data.blog_url; });
        }
        if (data.youtube_url) {
          document.querySelectorAll("[data-link='youtube']").forEach(function (a) { a.href = data.youtube_url; });
        }
      })
      .catch(function () { /* keep hardcoded fallback hrefs */ });
  }
})();
