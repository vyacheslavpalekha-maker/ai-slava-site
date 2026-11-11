(function () {
  var COUNTER = 114165039;

  function track(goal, params) {
    if (typeof ym !== "function" || !goal) return;
    try {
      if (params) ym(COUNTER, "reachGoal", goal, params);
      else ym(COUNTER, "reachGoal", goal);
    } catch (e) {}
  }

  window.aislavaTrack = track;

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (!el) return;
    var goal = el.getAttribute("data-track");
    if (!goal) return;
    var params = {};
    var label = el.getAttribute("data-track-label");
    if (label) params.label = label;
    track(goal, Object.keys(params).length ? params : undefined);
  });

  var header = document.querySelector(".header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (!header || !toggle || !nav) return;

  function setOpen(open) {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }

  toggle.addEventListener("click", function () {
    setOpen(!header.classList.contains("is-open"));
  });

  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();
