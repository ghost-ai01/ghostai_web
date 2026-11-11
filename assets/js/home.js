/* Ghost.AI home — "오늘의 TQQQ" card + latest posts (2026-11-11).
   Progressive enhancement: the page reads fine without this file — the card stays a
   link to signal.html and the latest list keeps its built-in fallback items.
   Data: signal.json · signal_history.json (daily.sh, public v0.3 strategy state) and
   posts/latest.json (publish_posts.sh). */
(function () {
  "use strict";
  if (!window.fetch || !(location.protocol === "http:" || location.protocol === "https:")) return;

  var STATES = {
    CASH:    { chip: "현금 보유 중" },
    HOLD:    { chip: "보유 중" },
    NEW_BUY: { chip: "매수 신호 발생" },
    SELL:    { chip: "매도 신호 발생" }
  };
  function norm(a) {
    a = String(a || "CASH").toUpperCase();
    return a === "NEW_SELL" ? "SELL" : a;
  }
  function $(id) { return document.getElementById(id); }
  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(x) { return x !== null && x !== undefined && !isNaN(x); }
  function money(x) { return "$" + Number(x).toFixed(2); }
  function pct(x) { var v = Number(x); return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + "%"; }
  var WD = ["일", "월", "화", "수", "목", "금", "토"];
  function krDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return (+m[2]) + "월 " + (+m[3]) + "일(" + WD[d.getUTCDay()] + ")";
  }
  function shortDate(iso) {
    var m = /^\d{4}-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? (+m[1]) + "/" + (+m[2]) : "";
  }

  /* ---------- 오늘의 TQQQ ---------- */
  function renderCard(snap, hist) {
    var card = $("today-card");
    if (!card || !snap || !snap.tqqq) return;
    var t = snap.tqqq;
    var action = norm(t.today_action);
    var st = STATES[action] || STATES.CASH;

    $("tc-asof").textContent = krDate(t.asof) + " 미국장 마감";
    $("tc-status").setAttribute("data-action", action);
    $("tc-chip").textContent = st.chip;
    if (num(t.current_close)) $("tc-close").textContent = money(t.current_close);

    var rows = (hist || []).filter(function (r) { return r && r.date && num(r.close); })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

    // 전일 대비 — 이력의 마지막 날이 오늘 기준일일 때만
    var n = rows.length;
    if (n >= 2 && rows[n - 1].date === t.asof) {
      var chg = (rows[n - 1].close / rows[n - 2].close - 1) * 100;
      var c = $("tc-chg");
      c.textContent = pct(chg);
      c.className = "tc-chg " + (chg >= 0 ? "up" : "down");
    }

    if (t.in_position && num(t.entry_price)) {
      $("tc-entry").textContent = money(t.entry_price);
      var p = $("tc-pnl");
      if (num(t.pnl_pct)) { p.textContent = pct(t.pnl_pct); p.className = Number(t.pnl_pct) >= 0 ? "up" : "down"; }
      $("tc-meta").hidden = false;
    }

    drawSpark(rows.slice(-90));
  }

  function drawSpark(rows) {
    var fig = $("tc-spark");
    if (!fig || rows.length < 10) return;
    var svg = fig.querySelector("svg");
    var W = 320, H = 84, PAD = 6;
    var lo = Infinity, hi = -Infinity;
    rows.forEach(function (r) { lo = Math.min(lo, r.close); hi = Math.max(hi, r.close); });
    var span = hi - lo || 1;
    function x(i) { return (i / (rows.length - 1)) * W; }
    function y(v) { return PAD + (1 - (v - lo) / span) * (H - PAD * 2); }

    var line = rows.map(function (r, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(r.close).toFixed(1); }).join(" ");
    var area = line + " L" + W + " " + H + " L0 " + H + " Z";

    // 보유 구간: 그날 종가에 포지션이 있었던 날(HOLD, 매도 신호일)로 끝나는 구간
    var held = "";
    for (var i = 1; i < rows.length; i++) {
      var a = norm(rows[i].action);
      if (a === "HOLD" || a === "SELL") {
        held += "M" + x(i - 1).toFixed(1) + " " + y(rows[i - 1].close).toFixed(1) +
                " L" + x(i).toFixed(1) + " " + y(rows[i].close).toFixed(1) + " ";
      }
    }
    var last = rows[rows.length - 1];
    svg.innerHTML =
      '<defs><linearGradient id="tcFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="currentColor" stop-opacity="0.16"/>' +
      '<stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="sp-area" d="' + area + '" fill="url(#tcFill)"/>' +
      '<path class="sp-line" d="' + line + '"/>' +
      (held ? '<path class="sp-held" d="' + held + '"/>' : "") +
      '<circle class="sp-dot" cx="' + x(rows.length - 1).toFixed(1) + '" cy="' + y(last.close).toFixed(1) + '" r="3"/>';
    svg.setAttribute("aria-label", "TQQQ 종가 추이 " + shortDate(rows[0].date) + "부터 " + shortDate(last.date) + "까지");
    $("tc-range").textContent = shortDate(rows[0].date) + " ~ " + shortDate(last.date) + " 종가";
    fig.hidden = false;
  }

  /* ---------- 최근 글 ---------- */
  function renderLatest(data) {
    if (!data) return;
    var d = $("latest-daily"), p = $("latest-pinned");
    if (d && data.daily && data.daily.length) {
      d.innerHTML = data.daily.map(function (x) {
        return '<li><a href="' + esc(x.url) + '"><span class="ld">' + esc(x.date) +
               '</span><span class="lt">' + esc(x.title) + "</span></a></li>";
      }).join("");
    }
    if (p && data.pinned && data.pinned.length) {
      p.innerHTML = data.pinned.map(function (x) {
        return '<li><a href="' + esc(x.url) + '"><span class="lk">' + esc(x.label) +
               '</span><span class="lt">' + esc(x.title) + "</span></a></li>";
      }).join("");
    }
  }

  Promise.all([getJSON("signal.json"), getJSON("signal_history.json")])
    .then(function (r) { renderCard(r[0], r[1]); });
  getJSON("posts/latest.json").then(renderLatest);
})();
