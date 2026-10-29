/* Ghost.AI — sign-up source tag (progressive enhancement; page works without it).
 *
 * 1. If the landing URL has ?ref=..., clean it ([a-z0-9_] only) and keep it in
 *    sessionStorage so it survives clicks inside the site.
 * 2. Every sign-up link (/join, member app /signup) gets ?ref=<value> added.
 *    Visitors who arrived without a tag get ref=web.
 *
 * Links are tagged on load, whenever another script rewrites an href (links.json
 * sync), and again right before they are used.
 */
(function () {
  "use strict";

  var KEY = "ghostai_ref";
  var FALLBACK = "web";
  var JOIN_HOSTS = { "www.ghostai.co.kr": "/join", "ghostai.co.kr": "/join", "ghostai-member.vercel.app": "/signup" };

  function clean(v) {
    if (!v) return "";
    v = String(v).toLowerCase().replace(/[\s.\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
    return v.slice(0, 32);
  }

  var ref = "";
  try {
    ref = clean(new URLSearchParams(location.search).get("ref"));
  } catch (e) { /* old browser: no tag from URL */ }

  try {
    if (ref) sessionStorage.setItem(KEY, ref);
    else ref = clean(sessionStorage.getItem(KEY));
  } catch (e) { /* storage blocked: keep the in-page value only */ }

  var tag = ref || FALLBACK;

  function isJoin(u) {
    var path = u.pathname.replace(/\/+$/, "") || "/";
    if (JOIN_HOSTS[u.hostname] === path) return true;
    // same-origin /join (local preview over http)
    return u.origin === location.origin && path === "/join";
  }

  function decorate(a) {
    if (!a || !a.getAttribute || !a.getAttribute("href")) return;
    try {
      var u = new URL(a.href, location.href);
      if (!isJoin(u)) return;
      if (u.searchParams.get("ref") === tag) return;
      u.searchParams.set("ref", tag);
      a.href = u.toString();
    } catch (e) { /* leave the link as is */ }
  }

  function decorateAll() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) decorate(links[i]);
  }

  function onUse(ev) {
    var el = ev.target;
    while (el && el.nodeName !== "A") el = el.parentNode;
    if (el) decorate(el);
  }

  ["mousedown", "touchstart", "focusin", "click", "auxclick", "contextmenu"].forEach(function (t) {
    document.addEventListener(t, onUse, { capture: true, passive: true });
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", decorateAll);
  else decorateAll();
  window.addEventListener("load", decorateAll);

  // links.json sync replaces hrefs after fetch — re-tag whatever it touches.
  if ("MutationObserver" in window) {
    try {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].target.nodeName === "A") decorate(list[i].target);
        }
      }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["href"] });
    } catch (e) { /* click-time tagging still applies */ }
  }
})();
