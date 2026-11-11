(function () {
  "use strict";

  const form = document.getElementById("trail-form");
  const list = document.getElementById("admin-trail-list");
  const search = document.getElementById("admin-search");
  const total = document.getElementById("trail-total");
  const empty = document.getElementById("admin-empty");
  const status = document.getElementById("admin-status");
  const formTitle = document.getElementById("form-title");
  const saveButton = document.getElementById("save-trail");
  const cancelButton = document.getElementById("cancel-edit");
  const resetButton = document.getElementById("reset-trails");
  const field = (name) => form.elements.namedItem(name);
  let trails = [];
  let editingId = null;

  function setStatus(message, kind) {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = !message;
  }

  function loadTrails() {
    try {
      trails = window.PahadiTrailStore.loadTrails();
      renderTrails();
    } catch (error) {
      console.error("Could not load trails in the admin panel.", error);
      setStatus("Trail data could not be loaded. Check browser storage, then refresh this page.", "error");
      form.querySelectorAll("input, select, textarea, button").forEach((control) => {
        control.disabled = true;
      });
      resetButton.disabled = true;
    }
  }

  function saveTrails() {
    try {
      window.PahadiTrailStore.saveTrails(trails);
      setStatus("Trail list saved in this browser. The explorer updates automatically.", "success");
      renderTrails();
      return true;
    } catch (error) {
      console.error("Could not save trail data in browser storage.", error);
      setStatus("Could not save changes. Browser storage may be full or unavailable.", "error");
      return false;
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderTrails() {
    const term = search.value.trim().toLocaleLowerCase();
    const visible = trails.filter((trail) =>
      `${trail.name} ${trail.region} ${trail.difficulty}`.toLocaleLowerCase().includes(term)
    );
    total.textContent = String(trails.length);

    const cards = visible.map((trail) => {
      const card = element("article", "admin-trail-item");
      const image = element("img");
      image.src = trail.image;
      image.alt = trail.imageAlt;
      image.loading = "lazy";

      const info = element("div", "admin-trail-info");
      info.append(
        element("p", "", trail.region),
        element("h3", "", trail.name),
        element("span", "", `${trail.difficulty} · ${trail.duration}`)
      );

      const actions = element("div", "admin-trail-actions");
      const editButton = element("button", "", "Edit");
      editButton.type = "button";
      editButton.dataset.action = "edit";
      editButton.addEventListener("click", () => beginEdit(trail));
      const deleteButton = element("button", "", "Delete");
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete";
      deleteButton.setAttribute("aria-label", `Delete ${trail.name}`);
      deleteButton.addEventListener("click", () => deleteTrail(trail));
      actions.append(editButton, deleteButton);
      card.append(image, info, actions);
      return card;
    });

    list.replaceChildren(...cards);
    empty.hidden = visible.length > 0;
  }

  function resetForm() {
    form.reset();
    field("id").value = "";
    editingId = null;
    formTitle.textContent = "Add a trail";
    saveButton.textContent = "Add trail";
    cancelButton.hidden = true;
  }

  function beginEdit(trail) {
    editingId = trail.id;
    Object.entries(trail).forEach(([key, value]) => {
      const control = field(key);
      if (control) control.value = String(value);
    });
    formTitle.textContent = "Edit trail";
    saveButton.textContent = "Save changes";
    cancelButton.hidden = false;
    setStatus("", "");
    field("name").focus();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function makeId(name) {
    const slug = name
      .normalize("NFKD")
      .toLocaleLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const base = slug || "trail";
    let id = base;
    let suffix = 2;
    while (trails.some((trail) => trail.id === id && trail.id !== editingId)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    return id;
  }

  function submitForm(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const name = String(formData.get("name")).trim();
    const duplicateName = trails.some(
      (trail) => trail.id !== editingId && trail.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (duplicateName) {
      setStatus("A trail with this name already exists. Choose a different name.", "error");
      field("name").focus();
      return;
    }

    const trail = {
      id: editingId || makeId(name),
      name,
      region: String(formData.get("region")).trim(),
      difficulty: String(formData.get("difficulty")),
      duration: String(formData.get("duration")).trim(),
      distanceKm: Number(formData.get("distanceKm")),
      altitudeM: Number(formData.get("altitudeM")),
      season: String(formData.get("season")).trim(),
      summary: String(formData.get("summary")).trim(),
      description: String(formData.get("description")).trim(),
      image: String(formData.get("image")).trim(),
      imageAlt: String(formData.get("imageAlt")).trim()
    };

    const wasEditing = Boolean(editingId);
    const updatedTrails = wasEditing
      ? trails.map((item) => (item.id === editingId ? trail : item))
      : [...trails, trail];
    const previousTrails = trails;
    trails = updatedTrails;
    if (!saveTrails()) {
      trails = previousTrails;
      renderTrails();
      return;
    }

    resetForm();
    setStatus(wasEditing ? `${trail.name} updated.` : `${trail.name} added to the trail list.`, "success");
  }

  function deleteTrail(trail) {
    if (!window.confirm(`Delete "${trail.name}" from the trail list?`)) return;
    const previousTrails = trails;
    trails = trails.filter((item) => item.id !== trail.id);
    if (!saveTrails()) {
      trails = previousTrails;
      renderTrails();
      return;
    }
    if (editingId === trail.id) resetForm();
    setStatus(`${trail.name} removed from the trail list.`, "success");
  }

  form.addEventListener("submit", submitForm);
  cancelButton.addEventListener("click", resetForm);
  search.addEventListener("input", renderTrails);
  resetButton.addEventListener("click", () => {
    if (!window.confirm("Restore the original starter trails? This replaces your current trail list in this browser.")) return;
    try {
      window.PahadiTrailStore.resetTrails();
      trails = window.PahadiTrailStore.loadTrails();
      resetForm();
      renderTrails();
      setStatus("Starter trails restored in this browser.", "success");
    } catch (error) {
      console.error("Could not restore starter trails.", error);
      setStatus("Could not restore starter trails. Browser storage may be unavailable.", "error");
    }
  });

  document.getElementById("current-year").textContent = String(new Date().getFullYear());
  window.addEventListener("storage", (event) => {
    if (event.key !== window.PahadiTrailStore.storageKey) return;
    loadTrails();
    setStatus("Trail data changed in another tab.", "success");
  });

  loadTrails();
})();
