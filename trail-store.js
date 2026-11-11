(function () {
  "use strict";

  const storageKey = "pahadipath-trails";

  function loadTrails() {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return window.PAHADI_TRAILS.map((trail) => ({ ...trail }));

    const trails = JSON.parse(stored);
    if (!Array.isArray(trails)) throw new TypeError("Saved trail data must be a list.");
    return trails;
  }

  function saveTrails(trails) {
    if (!Array.isArray(trails)) throw new TypeError("Trail data must be a list.");
    localStorage.setItem(storageKey, JSON.stringify(trails));
  }

  function resetTrails() {
    localStorage.removeItem(storageKey);
  }

  window.PahadiTrailStore = { storageKey, loadTrails, saveTrails, resetTrails };
})();
