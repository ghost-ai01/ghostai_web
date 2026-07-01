/* Ghost.AI signal status page.
   Data-driven render of the 4 today_action states from a TQQQ snapshot.
   Single source of truth: web/signal.json (built by the private signal pipeline).
   The HTML ships a hardcoded fallback (window.SIGNAL_FALLBACK) so the page works as
   file://; when served over http(s) it re-syncs from signal.json — same pattern as links.json.

   PUBLIC EXPOSURE: TQQQ only, no model-internal indicators. */
(function () {
  "use strict";

  /* ---------- shared header behaviour (sticky shadow + reveal) ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  var revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealItems.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- formatting helpers ---------- */
  function fmtPrice(v) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(v) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    var n = Number(v);
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  }
  function fmtDate(s) { return s ? s : "—"; }

  /* today_action -> presentation. CASH/HOLD/NEW_BUY/SELL all supported. */
  var STATES = {
    CASH:    { chip: "현금 보유 중",   big: "현금 보유 중",     note: "Ghost.AI 전략은 현재 TQQQ 포지션 없이 관망 중입니다. 신규 매수 신호가 발생하면 이 페이지에 표시됩니다.", live: false },
    HOLD:    { chip: "보유 중",       big: "보유 중",         note: "Ghost.AI 전략이 TQQQ 포지션을 유지하고 있습니다. 전략의 진입 정보와 수익률은 아래에서 확인하세요.",        live: true  },
    NEW_BUY: { chip: "매수 신호 발생", big: "매수 신호 발생",   note: "Ghost.AI 전략에서 신규 매수 신호가 발생했습니다. 자세한 내용은 데일리 리포트와 영상에서 확인하세요.",      live: true  },
    SELL:    { chip: "매도 신호 발생", big: "매도 신호 발생",   note: "Ghost.AI 전략에서 매도(청산) 신호가 발생했습니다. 자세한 내용은 데일리 리포트와 영상에서 확인하세요.",     live: true  }
  };

  function render(snap) {
    if (!snap || !snap.tqqq) return;
    var t = snap.tqqq;
    var action = (t.today_action || "CASH").toUpperCase();
    var state = STATES[action] || STATES.CASH;

    // asof
    var asofEl = document.getElementById("sig-asof-date");
    if (asofEl) asofEl.textContent = fmtDate(t.asof);

    // status panel theme + chip + big message + note
    var panel = document.getElementById("status-panel");
    var chip = document.getElementById("status-chip");
    var chipLabel = document.getElementById("status-chip-label");
    var big = document.getElementById("status-big");
    var note = document.getElementById("status-note");
    if (panel) panel.setAttribute("data-action", action);
    if (chip) {
      chip.setAttribute("data-action", action);
      chip.classList.toggle("live", !!state.live);
    }
    if (chipLabel) chipLabel.textContent = state.chip;
    if (big) { big.setAttribute("data-action", action); big.textContent = state.big; }
    if (note) note.textContent = state.note;

    // metrics — always show close; entry block only when holding
    var closeEl = document.getElementById("m-close");
    if (closeEl) closeEl.innerHTML = "$" + fmtPrice(t.current_close);

    var holding = action === "HOLD" && t.in_position;
    var entryWrap = document.getElementById("metrics-entry");
    if (entryWrap) entryWrap.hidden = !holding;

    if (holding) {
      var setVal = function (id, txt, cls) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = txt;
        el.className = "v" + (cls ? " " + cls : "");
      };
      setVal("m-entry-date", fmtDate(t.entry_date));
      setVal("m-entry-price", "$" + fmtPrice(t.entry_price));
      var pnl = t.pnl_pct;
      var pnlCls = (pnl === null || pnl === undefined) ? "muted" : (Number(pnl) >= 0 ? "up" : "down");
      setVal("m-pnl", fmtPct(pnl), pnlCls);
      var hd = t.hold_days_calendar;
      setVal("m-hold", (hd === null || hd === undefined) ? "—" : hd + "일");
    }
  }

  /* ---------- signal history (track record) table ---------- */
  var HIST_LABEL = { CASH: "현금 보유 중", HOLD: "보유 중", NEW_BUY: "매수 신호", SELL: "매도 신호" };

  function fmtPublished(s) {
    if (!s) return "—";
    // "2026-06-30T20:46:54+09:00" -> "2026-06-30 20:46"
    var m = String(s).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    return m ? m[1] + " " + m[2] : String(s);
  }

  function renderHistory(list) {
    var body = document.getElementById("sig-hist-body");
    if (!body) return;
    if (!Array.isArray(list) || !list.length) {
      var msg = (location.protocol === "file:")
        ? "이력은 서버로 페이지를 열었을 때 표시됩니다."
        : "아직 게시된 이력이 없습니다.";
      body.innerHTML = '<tr class="hist-empty"><td colspan="5">' + msg + "</td></tr>";
      return;
    }
    var rows = list.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)); // newest first
    });
    var html = rows.map(function (r) {
      var action = (r.action || "CASH").toUpperCase();
      var label = HIST_LABEL[action] || action;
      var pnl = r.pnl_pct;
      var pnlTxt = "—", pnlCls = "muted";
      if (pnl !== null && pnl !== undefined && !isNaN(pnl)) {
        pnlTxt = fmtPct(pnl); pnlCls = Number(pnl) >= 0 ? "up" : "down";
      }
      var close = (r.close === null || r.close === undefined || isNaN(r.close))
        ? "—" : "$" + fmtPrice(r.close);
      return "<tr>"
        + "<td>" + fmtDate(r.date) + "</td>"
        + '<td><span class="hist-badge" data-action="' + action + '">' + label + "</span></td>"
        + "<td>" + close + "</td>"
        + '<td class="' + pnlCls + '">' + pnlTxt + "</td>"
        + '<td class="pub">' + fmtPublished(r.published_at) + "</td>"
        + "</tr>";
    }).join("");
    body.innerHTML = html;
  }

  // 1) immediate render from hardcoded fallback (works on file://)
  if (window.SIGNAL_FALLBACK) render(window.SIGNAL_FALLBACK);
  renderHistory(window.SIGNAL_HISTORY_FALLBACK || null);

  // 2) re-sync from signal.json when served over http(s)
  if (location.protocol === "http:" || location.protocol === "https:") {
    fetch("signal.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) render(data); })
      .catch(function () { /* keep fallback render */ });

    // track-record history (accumulated daily; never overwritten)
    fetch("signal_history.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) renderHistory(data); })
      .catch(function () { /* keep empty-state */ });

    // keep external links in lockstep with links.json (shared SoT)
    fetch("links.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (data.blog_url)
          document.querySelectorAll("[data-link='blog']").forEach(function (a) { a.href = data.blog_url; });
        if (data.youtube_url)
          document.querySelectorAll("[data-link='youtube']").forEach(function (a) { a.href = data.youtube_url; });
      })
      .catch(function () { /* keep hardcoded fallback hrefs */ });
  }
})();
