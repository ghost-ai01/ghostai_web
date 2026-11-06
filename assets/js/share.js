/* Ghost.AI — share box (progressive enhancement; nothing shows without JS).
 *
 * Put <div data-share hidden></div> where the box should appear. Optional:
 *   data-share-title  title passed to the share sheet (default: page <title> minus " · Ghost.AI")
 *   data-share-label  line above the buttons
 *
 * Shared links carry ?ref=share (share_naver for the Naver button) so sign-ups that come
 * through them show up in the member app's sign-up source count — ref.js keeps the tag
 * while the visitor clicks around and adds it to the /join link.
 * The URL is the page's canonical address, so a ?ref= the sharer arrived with is dropped.
 */
(function () {
  "use strict";

  var boxes = document.querySelectorAll("[data-share]");
  if (!boxes.length) return;

  // Colors come from the page (inherited text color + translucent gray) so the box reads on the dark
  // site theme and on the light/dark standalone chart pages alike.
  var CSS =
    ".share-box{margin:28px 0;padding:22px 24px;border:1px solid rgba(128,128,128,.35);border-radius:16px;" +
    "background:rgba(128,128,128,.05);text-align:left}" +
    ".share-box p{margin:0 0 14px;color:inherit;opacity:.78;font-size:.98rem;word-break:keep-all}" +
    ".share-row{display:flex;flex-wrap:wrap;gap:10px}" +
    ".share-box .share-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;" +
    "font:inherit;font-size:.95rem;font-weight:700;cursor:pointer;color:inherit;" +
    "background:rgba(128,128,128,.08);border:1px solid rgba(128,128,128,.5);text-decoration:none;" +
    "transition:border-color .2s,background .2s}" +
    ".share-box .share-btn:hover,.share-box .share-btn:focus-visible{border-color:rgba(86,204,222,.7);background:rgba(86,204,222,.1)}" +
    ".share-box .share-btn svg{width:18px;height:18px;flex:none}" +
    ".share-box .share-btn.main{background:linear-gradient(135deg,#f0d08a,#d6ae60);color:#1a1305;border-color:transparent}" +
    ".share-box .share-btn.naver b{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:4px;" +
    "background:#03c75a;color:#fff;font-size:.72rem;line-height:1}" +
    ".share-box .share-msg{min-height:1.2em;margin:10px 0 0;font-size:.88rem;opacity:.9}" +
    "@media (max-width:480px){.share-box{padding:18px 16px}.share-box .share-btn{flex:1 1 auto;justify-content:center}}";

  var ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/>' +
    '<path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>';
  var ICON_LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/>' +
    '<path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';

  function pageUrl(ref) {
    var c = document.querySelector('link[rel="canonical"]');
    var base = (c && c.href) || (location.origin + location.pathname);
    try {
      var u = new URL(base, location.href);
      u.search = "";
      u.hash = "";
      u.searchParams.set("ref", ref);
      return u.toString();
    } catch (e) {
      return base;
    }
  }

  function pageTitle(box) {
    return box.getAttribute("data-share-title") ||
      document.title.replace(/\s*·\s*Ghost\.AI\s*$/, "");
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (ok, fail) {
      var t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy") ? ok() : fail(); } catch (e) { fail(e); }
      document.body.removeChild(t);
    });
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  function build(box) {
    var title = pageTitle(box);
    var label = box.getAttribute("data-share-label") ||
      "<b>도움이 됐다면 공유해 주세요.</b> TQQQ 투자하는 분께 보내 주시면 같은 자료를 바로 보실 수 있습니다.";
    var msg = el("p", "share-msg");
    msg.setAttribute("aria-live", "polite");
    var row = el("div", "share-row");

    // Phones get the OS share sheet (KakaoTalk, messages, etc. are in it).
    if (navigator.share) {
      var s = el("button", "share-btn main", ICON_SHARE + "공유하기");
      s.type = "button";
      s.addEventListener("click", function () {
        navigator.share({ title: title, url: pageUrl("share") }).catch(function () { /* closed */ });
      });
      row.appendChild(s);
    }

    var c = el("button", "share-btn" + (navigator.share ? "" : " main"), ICON_LINK + "링크 복사");
    c.type = "button";
    c.addEventListener("click", function () {
      copy(pageUrl("share")).then(function () {
        msg.textContent = "링크를 복사했습니다. 카카오톡이나 메신저에 붙여 넣으세요.";
      }, function () {
        msg.textContent = "복사하지 못했습니다. 주소창의 주소를 직접 복사해 주세요.";
      });
    });
    row.appendChild(c);

    var n = el("a", "share-btn naver", "<b aria-hidden=\"true\">N</b>네이버 공유");
    n.href = "https://share.naver.com/web/shareView?url=" + encodeURIComponent(pageUrl("share_naver")) +
      "&title=" + encodeURIComponent(title);
    n.target = "_blank";
    n.rel = "noopener";
    row.appendChild(n);

    box.className = (box.className ? box.className + " " : "") + "share-box";
    box.innerHTML = "";
    box.appendChild(el("p", "", label));
    box.appendChild(row);
    box.appendChild(msg);
    box.hidden = false;
  }

  var st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);
  for (var i = 0; i < boxes.length; i++) build(boxes[i]);
})();
