/* Ghost.AI backtest performance page.
   Renders the verified V2bc 16-year backtest metrics.
   Single source of truth: web/backtest.json (verified via script_make_database/backtest_v0_v2bc.py
   + open-to-open equity reconstruction cross-check).
   The HTML ships a hardcoded fallback (window.BACKTEST_FALLBACK) so the page works as
   file://; when served over http(s) it re-syncs from backtest.json — same pattern as links.json.

   PUBLIC EXPOSURE: aggregate performance metrics only; no model-internal indicators or
   entry/exit rules are referenced anywhere. */
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
    }, { threshold: 0.10, rootMargin: "0px 0px -40px 0px" });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- formatting helpers ---------- */
  function fmtInt(v) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Math.round(Number(v)).toLocaleString("en-US");
  }
  function fmtMoney(v) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return "$" + Math.round(Number(v)).toLocaleString("en-US");
  }
  function fmtPct(v, plus) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    var n = Number(v);
    var sign = plus && n > 0 ? "+" : "";
    return sign + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  }
  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function render(d) {
    if (!d) return;
    var s = d.strategy || {};
    var b = d.buyhold_tqqq || {};
    var t = d.trades || {};

    // period
    setText("bt-period", (d.period_start || "—") + " ~ " + (d.period_end || "—"));
    if (d.years) setText("bt-years", "약 " + Number(d.years).toFixed(1) + "년");
    if (d.trading_days) setText("bt-days", fmtInt(d.trading_days) + " 거래일");

    // headline metric cards (strategy)
    setText("bt-total-return", fmtPct(s.total_return_pct, true));
    setText("bt-final-value", fmtMoney(s.final_value));
    setText("bt-cagr", fmtPct(s.cagr_pct, true));
    setText("bt-mdd", fmtPct(s.mdd_pct, false));
    setText("bt-sharpe", s.sharpe != null ? Number(s.sharpe).toFixed(2) : "—");
    setText("bt-calmar", s.calmar != null ? Number(s.calmar).toFixed(2) : "—");

    // trade stats
    setText("bt-trades", t.num_trades != null ? fmtInt(t.num_trades) + "회" : "—");
    setText("bt-exposure", fmtPct(d.exposure_pct, false));

    // insight — MDD three-way comparison (strategy vs 1x QQQ vs 3x TQQQ)
    var m = d.mdd_compare || {};
    setText("ins-mdd-strategy", fmtPct(m.strategy_pct, false));
    setText("ins-mdd-qqq", fmtPct(m.qqq_buyhold_pct, false));
    setText("ins-mdd-tqqq", fmtPct(m.tqqq_buyhold_pct, false));

    // zero-loss holding analysis (rolling-window loss rate by horizon)
    var z = d.holding_zero_loss || {};
    var bh = z.by_horizon || {};
    setText("zl-1y", bh["1y"] != null ? fmtPct(bh["1y"], false) : "—");
    setText("zl-2y", bh["2y"] != null ? fmtPct(bh["2y"], false) : "—");
    setText("zl-3y", bh["3y"] != null ? fmtPct(bh["3y"], false) : "—");
    setText("zl-1y-inline", bh["1y"] != null ? fmtPct(bh["1y"], false) : "—");
    setText("zl-2y-inline", bh["2y"] != null ? fmtPct(bh["2y"], false) : "—");
    if (z.zero_loss_min_years != null) setText("zl-min-years", z.zero_loss_min_years + "년");
    setText("zl-worst-3y", fmtPct(z.worst_3y_return_pct, true));
    if (z.zero_loss_min_trading_days != null) setText("zl-min-days", fmtInt(z.zero_loss_min_trading_days));
    if (z.zero_loss_min_months != null) {
      setText("zl-min-months", Number(z.zero_loss_min_months).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    }
    if (z.zero_loss_min_years != null) {
      var yrs = (z.zero_loss_min_months != null) ? (z.zero_loss_min_months / 12) : z.zero_loss_min_years;
      setText("zl-min-years-precise", yrs.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    }

    // comparison table — strategy column
    setText("c-strat-return", fmtPct(s.total_return_pct, true));
    setText("c-strat-final", fmtMoney(s.final_value));
    setText("c-strat-cagr", fmtPct(s.cagr_pct, true));
    setText("c-strat-mdd", fmtPct(s.mdd_pct, false));
    setText("c-strat-exposure", fmtPct(d.exposure_pct, false));

    // comparison table — buy & hold column
    setText("c-bh-return", fmtPct(b.total_return_pct, true));
    setText("c-bh-final", fmtMoney(b.final_value));
    setText("c-bh-cagr", fmtPct(b.cagr_pct, true));
    setText("c-bh-mdd", fmtPct(b.mdd_pct, false));
    setText("c-bh-exposure", "100%");

    // initial capital references
    if (d.initial_capital) {
      document.querySelectorAll("[data-fill='initial']").forEach(function (el) {
        el.textContent = fmtMoney(d.initial_capital);
      });
    }
    if (d.updated_at) setText("bt-updated", d.updated_at);
  }

  // 1) immediate render from hardcoded fallback (works on file://)
  if (window.BACKTEST_FALLBACK) render(window.BACKTEST_FALLBACK);

  // 2) re-sync from backtest.json when served over http(s)
  if (location.protocol === "http:" || location.protocol === "https:") {
    fetch("backtest.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) render(data); })
      .catch(function () { /* keep fallback render */ });

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
