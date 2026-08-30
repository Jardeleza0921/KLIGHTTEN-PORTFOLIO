(function () {
  "use strict";

  const DATA_KEY = "klightten.portfolio.data.v1";
  const THEME_KEY = "klightten.portfolio.theme";
  const THEMES = ["neon-arcade", "classic-green", "black-white", "red-hat"];
  const THEME_LABELS = {
    "neon-arcade": "Neon Arcade",
    "classic-green": "Classic Green",
    "black-white": "Black & White",
    "red-hat": "Red Hat"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const defaults = clone(window.KLIGHTTEN_PORTFOLIO || { works: [], skills: [], journey: [], profile: {} });

  function readLocalData() {
    try {
      const saved = localStorage.getItem(DATA_KEY);
      if (!saved) return clone(defaults);
      const parsed = JSON.parse(saved);
      return parsed && Array.isArray(parsed.works) ? parsed : clone(defaults);
    } catch {
      return clone(defaults);
    }
  }

  function writeLocalData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("klightten:data-change"));
  }

  function clearLocalData() {
    localStorage.removeItem(DATA_KEY);
    window.dispatchEvent(new CustomEvent("klightten:data-change"));
  }

  function hasLocalDraft() {
    return Boolean(localStorage.getItem(DATA_KEY));
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeLink(value) {
    if (!value) return "";
    try {
      const parsed = new URL(value, window.location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function slug(value) {
    return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value ?? "";
    });
  }

  function applyTheme(theme) {
    const selected = THEMES.includes(theme) ? theme : "neon-arcade";
    document.documentElement.dataset.theme = selected;
    localStorage.setItem(THEME_KEY, selected);
    document.querySelectorAll("[data-theme-select]").forEach((select) => {
      select.value = selected;
    });
    document.querySelectorAll("[data-theme-name]").forEach((node) => {
      node.textContent = THEME_LABELS[selected];
    });
  }

  function renderProfile(data) {
    const profile = data.profile || {};
    setText("[data-profile-name]", profile.name);
    setText("[data-profile-role]", profile.role);
    setText("[data-profile-stage]", profile.stage);
    setText("[data-profile-focus]", profile.currentFocus);
    setText("[data-profile-headline]", profile.headline);
    setText("[data-profile-intro]", profile.intro);
    setText("[data-updated]", data.updated || "In progress");

    document.querySelectorAll("[data-github-link]").forEach((anchor) => {
      const href = safeLink(profile.github);
      if (href) anchor.href = href;
    });
    document.querySelectorAll("[data-klightten-link]").forEach((anchor) => {
      const href = safeLink(profile.klightten);
      if (href) anchor.href = href;
    });
  }

  function renderStats(data) {
    const works = (Array.isArray(data.works) ? data.works : []).filter((item) => item.published !== false);
    const categories = new Set(works.map((item) => item.category).filter(Boolean));
    const released = works.filter((item) => /released|complete|live/i.test(item.status || "")).length;
    const active = works.filter((item) => /current|active|development|progress|prototype/i.test(item.status || "")).length;
    setText("[data-stat-total]", String(works.length).padStart(2, "0"));
    setText("[data-stat-categories]", String(categories.size).padStart(2, "0"));
    setText("[data-stat-released]", String(released).padStart(2, "0"));
    setText("[data-stat-active]", String(active).padStart(2, "0"));
  }

  function renderSkills(data) {
    const root = document.querySelector("[data-skills-grid]");
    if (!root) return;
    root.innerHTML = (data.skills || []).map((group, index) => `
      <article class="skill-card">
        <div class="skill-card__index">0${index + 1}</div>
        <h3>${escapeHTML(group.group)}</h3>
        <ul>${(group.items || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      </article>
    `).join("");
  }

  function renderJourney(data) {
    const root = document.querySelector("[data-journey-list]");
    if (!root) return;
    root.innerHTML = (data.journey || []).map((item, index) => `
      <article class="journey-item">
        <div class="journey-rail"><span class="journey-dot ${index < 3 ? "is-active" : ""}"></span></div>
        <div class="journey-phase"><span>${escapeHTML(item.phase)}</span><b>${escapeHTML(item.status)}</b></div>
        <div class="journey-copy"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p></div>
      </article>
    `).join("");
  }

  const filters = { search: "", category: "all", status: "all" };

  function fillFilters(data) {
    const categorySelect = document.querySelector("[data-category-filter]");
    const statusSelect = document.querySelector("[data-status-filter]");
    const works = (data.works || []).filter((item) => item.published !== false);

    if (categorySelect) {
      const current = filters.category;
      const categories = [...new Set(works.map((item) => item.category).filter(Boolean))].sort();
      categorySelect.innerHTML = `<option value="all">All categories</option>${categories.map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join("")}`;
      categorySelect.value = categories.includes(current) ? current : "all";
      filters.category = categorySelect.value;
    }

    if (statusSelect) {
      const current = filters.status;
      const statuses = [...new Set(works.map((item) => item.status).filter(Boolean))].sort();
      statusSelect.innerHTML = `<option value="all">All statuses</option>${statuses.map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join("")}`;
      statusSelect.value = statuses.includes(current) ? current : "all";
      filters.status = statusSelect.value;
    }
  }

  function visibleWorks(data) {
    const query = filters.search.trim().toLowerCase();
    return (data.works || []).filter((work) => {
      if (work.published === false) return false;
      const haystack = [work.title, work.category, work.status, work.year, work.description, ...(work.tech || [])].join(" ").toLowerCase();
      const searchMatch = !query || haystack.includes(query);
      const categoryMatch = filters.category === "all" || work.category === filters.category;
      const statusMatch = filters.status === "all" || work.status === filters.status;
      return searchMatch && categoryMatch && statusMatch;
    });
  }

  function renderWorks(data) {
    const root = document.querySelector("[data-work-grid]");
    if (!root) return;
    const works = visibleWorks(data);
    setText("[data-result-count]", `${works.length} ${works.length === 1 ? "work" : "works"}`);

    if (!works.length) {
      root.innerHTML = `<div class="empty-state"><span>NO_MATCH</span><h3>No work found.</h3><p>Try a different search, category, or status.</p></div>`;
      return;
    }

    root.innerHTML = works.map((work, index) => {
      const tags = (work.tech || []).map((item) => `<span>${escapeHTML(item)}</span>`).join("");
      return `
        <article class="work-card ${work.featured ? "is-featured" : ""}" data-work-card="${escapeHTML(work.id)}">
          <button class="work-card__open" type="button" data-open-work="${escapeHTML(work.id)}" aria-label="View ${escapeHTML(work.title)} details"></button>
          <div class="work-card__top">
            <span class="work-card__number">${String(index + 1).padStart(2, "0")}</span>
            <span class="status-badge status-${slug(work.status)}">${escapeHTML(work.status)}</span>
          </div>
          <div class="work-card__body">
            <p class="work-card__category">${escapeHTML(work.category)} · ${escapeHTML(work.year)}</p>
            <h3>${escapeHTML(work.title)}</h3>
            <p>${escapeHTML(work.description)}</p>
          </div>
          <div class="tag-list">${tags}</div>
          <span class="work-card__arrow" aria-hidden="true">↗</span>
        </article>
      `;
    }).join("");
  }

  function openWork(id, data) {
    const work = (data.works || []).find((item) => item.id === id);
    const dialog = document.querySelector("[data-work-dialog]");
    const content = document.querySelector("[data-work-dialog-content]");
    if (!work || !dialog || !content) return;
    const href = safeLink(work.link);
    content.innerHTML = `
      <p class="dialog-eyebrow">${escapeHTML(work.category)} · ${escapeHTML(work.year)}</p>
      <div class="dialog-title-row"><h2>${escapeHTML(work.title)}</h2><span class="status-badge">${escapeHTML(work.status)}</span></div>
      <p class="dialog-description">${escapeHTML(work.description)}</p>
      <div class="tag-list dialog-tags">${(work.tech || []).map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>
      ${href ? `<a class="button button-primary" href="${escapeHTML(href)}" target="_blank" rel="noreferrer">${escapeHTML(work.linkLabel || "Open project")} <span aria-hidden="true">↗</span></a>` : `<p class="private-note">Project link will be added when this work is ready to share.</p>`}
    `;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function refresh() {
    const data = readLocalData();
    renderProfile(data);
    renderStats(data);
    renderSkills(data);
    renderJourney(data);
    fillFilters(data);
    renderWorks(data);
    setText("[data-draft-state]", hasLocalDraft() ? "Local draft active" : "Published library");
    document.body.dataset.draft = hasLocalDraft() ? "true" : "false";
    return data;
  }

  function init() {
    applyTheme(localStorage.getItem(THEME_KEY) || "neon-arcade");
    let data = refresh();

    document.querySelectorAll("[data-theme-select]").forEach((select) => {
      select.addEventListener("change", (event) => applyTheme(event.target.value));
    });

    const search = document.querySelector("[data-work-search]");
    const category = document.querySelector("[data-category-filter]");
    const status = document.querySelector("[data-status-filter]");
    if (search) search.addEventListener("input", (event) => { filters.search = event.target.value; renderWorks(data); });
    if (category) category.addEventListener("change", (event) => { filters.category = event.target.value; renderWorks(data); });
    if (status) status.addEventListener("change", (event) => { filters.status = event.target.value; renderWorks(data); });

    document.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-open-work]");
      if (openButton) openWork(openButton.dataset.openWork, data);
      const closeButton = event.target.closest("[data-close-dialog]");
      if (closeButton) closeDialog(closeButton.closest("dialog"));
    });

    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
    });

    window.addEventListener("klightten:data-change", () => { data = refresh(); });
    window.addEventListener("storage", (event) => {
      if (event.key === DATA_KEY) { data = refresh(); }
      if (event.key === THEME_KEY) applyTheme(event.newValue || "neon-arcade");
    });
  }

  window.KlighttenPortfolio = {
    DATA_KEY,
    THEME_KEY,
    THEMES: [...THEMES],
    defaults: () => clone(defaults),
    read: readLocalData,
    write: writeLocalData,
    reset: clearLocalData,
    hasDraft: hasLocalDraft,
    applyTheme,
    escapeHTML,
    safeLink,
    slug
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
