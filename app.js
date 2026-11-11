(function () {
  "use strict";

  let trails;
  const grid = document.getElementById("trail-grid");
  const searchInput = document.getElementById("trail-search");
  const sortSelect = document.getElementById("trail-sort");
  const filterButtons = Array.from(document.querySelectorAll("[data-difficulty]"));
  const savedToggle = document.getElementById("saved-toggle");
  const savedCount = document.getElementById("saved-count");
  const resultCount = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const clearFiltersButton = document.getElementById("clear-filters");
  const dialog = document.getElementById("trail-dialog");
  const dialogContent = document.getElementById("dialog-content");
  const dialogClose = document.getElementById("dialog-close");
  const toast = document.getElementById("toast");
  const state = {
    difficulty: "all",
    savedOnly: false,
    saved: loadSavedTrails(),
    toastTimer: null
  };

  try {
    trails = window.PahadiTrailStore.loadTrails();
  } catch (error) {
    console.error("Could not load trail data.", error);
    trails = window.PAHADI_TRAILS;
    window.setTimeout(() => showToast("Saved trail data could not be loaded. Showing the original trails."), 0);
  }

  function loadSavedTrails() {
    try {
      const saved = JSON.parse(localStorage.getItem("pahadipath-saved") || "[]");
      return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
    } catch (error) {
      console.error("Could not read saved trails from browser storage.", error);
      window.setTimeout(() => showToast("Saved trails could not be loaded from this browser."), 0);
      return [];
    }
  }

  function saveTrailIds() {
    try {
      localStorage.setItem("pahadipath-saved", JSON.stringify(state.saved));
      return true;
    } catch (error) {
      console.error("Could not save trails to browser storage.", error);
      showToast("Your browser couldn't store this change. It will last for this visit only.");
      return false;
    }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeFact(label, value) {
    const wrapper = makeElement("div", "meta-item");
    wrapper.append(makeElement("span", "", label), makeElement("strong", "", value));
    return wrapper;
  }

  function createTrailCard(trail) {
    const card = makeElement("article", "trail-card");
    const imageWrap = makeElement("div", "trail-card-image");
    const image = makeElement("img");
    image.src = trail.image;
    image.alt = trail.imageAlt;
    image.loading = "lazy";
    image.decoding = "async";

    const difficulty = makeElement("span", "difficulty-badge", trail.difficulty);
    difficulty.dataset.level = trail.difficulty;

    const favorite = makeElement("button", "favorite-button", state.saved.includes(trail.id) ? "♥" : "♡");
    favorite.type = "button";
    favorite.classList.toggle("is-saved", state.saved.includes(trail.id));
    favorite.setAttribute("aria-label", `${state.saved.includes(trail.id) ? "Remove" : "Save"} ${trail.name}`);
    favorite.setAttribute("aria-pressed", String(state.saved.includes(trail.id)));
    favorite.addEventListener("click", () => toggleSaved(trail));
    imageWrap.append(image, difficulty, favorite);

    const content = makeElement("div", "trail-card-content");
    content.append(makeElement("p", "trail-region", trail.region));
    content.append(makeElement("h3", "", trail.name));
    content.append(makeElement("p", "trail-teaser", trail.summary));

    const meta = makeElement("div", "trail-meta");
    meta.append(
      makeFact("TIME", trail.duration),
      makeFact("DISTANCE", `${trail.distanceKm} km`),
      makeFact("HIGH POINT", `${trail.altitudeM.toLocaleString("en-IN")} m`)
    );

    const footer = makeElement("div", "card-footer");
    const season = makeElement("span", "season-label");
    season.append(makeElement("span", "", "✳"), document.createTextNode(` ${trail.season}`));
    const detailsButton = makeElement("button", "card-link");
    detailsButton.type = "button";
    detailsButton.append(document.createTextNode("Trail details "), makeElement("span", "", "↗"));
    detailsButton.addEventListener("click", () => openTrailDetails(trail));
    footer.append(season, detailsButton);

    content.append(meta, footer);
    card.append(imageWrap, content);
    return card;
  }

  function getVisibleTrails() {
    const searchTerm = searchInput.value.trim().toLocaleLowerCase();
    const visible = trails.filter((trail) => {
      const matchesDifficulty = state.difficulty === "all" || trail.difficulty === state.difficulty;
      const matchesSaved = !state.savedOnly || state.saved.includes(trail.id);
      const searchableText = `${trail.name} ${trail.region} ${trail.summary} ${trail.season}`.toLocaleLowerCase();
      return matchesDifficulty && matchesSaved && searchableText.includes(searchTerm);
    });

    switch (sortSelect.value) {
      case "shortest":
        visible.sort((a, b) => a.distanceKm - b.distanceKm);
        break;
      case "longest":
        visible.sort((a, b) => b.distanceKm - a.distanceKm);
        break;
      case "altitude":
        visible.sort((a, b) => b.altitudeM - a.altitudeM);
        break;
      default:
        visible.sort((a, b) => trails.indexOf(a) - trails.indexOf(b));
    }
    return visible;
  }

  function renderTrails() {
    const visible = getVisibleTrails();
    grid.replaceChildren(...visible.map(createTrailCard));
    emptyState.hidden = visible.length > 0;
    grid.hidden = visible.length === 0;
    resultCount.textContent = `${visible.length} ${visible.length === 1 ? "trail" : "trails"} to explore`;
    savedCount.textContent = String(state.saved.length);
    savedToggle.setAttribute("aria-pressed", String(state.savedOnly));
    savedToggle.classList.toggle("is-filtering", state.savedOnly);
  }

  function toggleSaved(trail) {
    const isSaved = state.saved.includes(trail.id);
    state.saved = isSaved
      ? state.saved.filter((id) => id !== trail.id)
      : [...state.saved, trail.id];
    saveTrailIds();
    renderTrails();
    showToast(isSaved ? `${trail.name} removed from your saved trails.` : `${trail.name} saved for later.`);
    if (dialog.open) openTrailDetails(trail);
  }

  function addDialogFact(container, label, value) {
    const fact = makeElement("div", "dialog-fact");
    fact.append(makeElement("span", "", label), makeElement("strong", "", value));
    container.append(fact);
  }

  function openTrailDetails(trail) {
    dialogContent.replaceChildren();
    const image = makeElement("img", "dialog-hero");
    image.src = trail.image;
    image.alt = trail.imageAlt;

    const body = makeElement("div", "dialog-body");
    const title = makeElement("h2", "", trail.name);
    title.id = "dialog-title";
    body.append(
      makeElement("p", "trail-region", trail.region),
      title,
      makeElement("p", "dialog-description", trail.description)
    );

    const facts = makeElement("div", "dialog-facts");
    addDialogFact(facts, "DIFFICULTY", trail.difficulty);
    addDialogFact(facts, "DURATION", trail.duration);
    addDialogFact(facts, "DISTANCE", `${trail.distanceKm} km`);
    addDialogFact(facts, "HIGH POINT", `${trail.altitudeM.toLocaleString("en-IN")} m`);
    body.append(facts);

    const season = makeElement("p", "dialog-season");
    season.append(makeElement("strong", "", "Best season: "), document.createTextNode(trail.season));
    body.append(season);

    const actions = makeElement("div", "dialog-footer");
    const saveButton = makeElement(
      "button",
      "button button-dark",
      state.saved.includes(trail.id) ? "♥  Saved for later" : "♡  Save this trail"
    );
    saveButton.type = "button";
    saveButton.addEventListener("click", () => toggleSaved(trail));
    const closeButton = makeElement("button", "button button-outline", "Back to trails");
    closeButton.type = "button";
    closeButton.addEventListener("click", () => dialog.close());
    actions.append(saveButton, closeButton);
    body.append(actions);
    dialogContent.append(image, body);
    if (!dialog.open) dialog.showModal();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.difficulty = button.dataset.difficulty;
      filterButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      renderTrails();
    });
  });

  searchInput.addEventListener("input", renderTrails);
  sortSelect.addEventListener("change", renderTrails);
  savedToggle.addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    renderTrails();
    document.getElementById("discover").scrollIntoView({ behavior: "smooth" });
  });

  clearFiltersButton.addEventListener("click", () => {
    searchInput.value = "";
    state.difficulty = "all";
    state.savedOnly = false;
    sortSelect.value = "recommended";
    filterButtons.forEach((button) => {
      const isActive = button.dataset.difficulty === "all";
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    renderTrails();
    searchInput.focus();
  });

  dialogClose.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== window.PahadiTrailStore.storageKey) return;
    try {
      trails = window.PahadiTrailStore.loadTrails();
      state.saved = state.saved.filter((id) => trails.some((trail) => trail.id === id));
      saveTrailIds();
      renderTrails();
      showToast("Trail updates are now showing.");
    } catch (error) {
      console.error("Could not refresh trail data after an update.", error);
      showToast("Could not load the latest trail updates. Refresh the page to try again.");
    }
  });

  document.getElementById("current-year").textContent = String(new Date().getFullYear());
  renderTrails();
})();
