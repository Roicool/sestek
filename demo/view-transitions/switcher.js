/* Demo-only: wires the floating mode switcher to Sestek.setPageTransition and
   reflects the active feel. The real component never ships this file. */
document.addEventListener("DOMContentLoaded", function () {
  var sw = document.querySelector(".pt-switch");
  if (!sw) return;

  function sync() {
    var mode = document.documentElement.getAttribute("data-pt") || "fade";
    sw.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false");
    });
  }

  sw.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    Sestek.setPageTransition(btn.dataset.mode);
    sync();
  });

  sync();
});
