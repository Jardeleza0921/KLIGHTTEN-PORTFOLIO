(function () {
  "use strict";

  function initManager() {
    const store = window.KlighttenPortfolio;
    if (!store) return;

    const list = document.querySelector("[data-manager-list]");
    const form = document.querySelector("[data-work-form]");
    const dialog = document.querySelector("[data-editor-dialog]");
    const search = document.querySelector("[data-manager-search]");
    const importInput = document.querySelector("[data-import-file]");
    let data = store.read();
    let query = "";

    const $ = (selector) => document.querySelector(selector);

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function monthYear() {
      return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date());
    }

    function uniqueId(title, currentId) {
      const base = store.slug(title) || "new-work";
      let candidate = base;
      let count = 2;
      while (data.works.some((item) => item.id === candidate && item.id !== currentId)) {
        candidate = `${base}-${count++}`;
      }
      return candidate;
    }

    function toast(message, tone) {
      const node = $("[data-manager-toast]");
      if (!node) return;
      node.textContent = message;
      node.dataset.tone = tone || "success";
      node.hidden = false;
      window.clearTimeout(toast.timer);
      toast.timer = window.setTimeout(() => { node.hidden = true; }, 3600);
    }

    function persist(message) {
      data.updated = monthYear();
      store.write(data);
      render();
      if (message) toast(message);
    }

    function renderStats() {
      const works = data.works || [];
      const categories = new Set(works.map((item) => item.category).filter(Boolean));
      const featured = works.filter((item) => item.featured).length;
      const published = works.filter((item) => item.published !== false).length;
      $("[data-manager-total]").textContent = works.length;
      $("[data-manager-categories]").textContent = categories.size;
      $("[data-manager-featured]").textContent = featured;
      const publishedNode = $("[data-manager-published]");
      if (publishedNode) publishedNode.textContent = published;
      const state = $("[data-manager-state]");
      state.textContent = store.hasDraft() ? "Local draft active" : "Using published data";
      state.dataset.active = store.hasDraft() ? "true" : "false";
    }

    function render() {
      if (!list) return;
      renderStats();
      const visible = (data.works || []).filter((work) => {
        if (!query) return true;
        return [work.title, work.category, work.status, work.year, ...(work.tech || [])]
          .join(" ").toLowerCase().includes(query);
      });

      if (!visible.length) {
        list.innerHTML = `<div class="manager-empty"><h3>No matching work</h3><p>Clear the search or add a new project.</p></div>`;
        return;
      }

      list.innerHTML = visible.map((work) => {
        const realIndex = data.works.findIndex((item) => item.id === work.id);
        return `
          <article class="manager-item" data-manager-item="${store.escapeHTML(work.id)}" data-unpublished="${work.published === false}">
            <div class="manager-item__order">${String(realIndex + 1).padStart(2, "0")}</div>
            <div class="manager-item__main">
              <div><h3>${store.escapeHTML(work.title)}</h3>${work.featured ? `<span class="featured-label">Featured</span>` : ""}${work.published === false ? `<span class="featured-label unpublished-label">Hidden</span>` : ""}</div>
              <p>${store.escapeHTML(work.category)} · ${store.escapeHTML(work.status)} · ${store.escapeHTML(work.year)}</p>
              <div class="tag-list">${(work.tech || []).map((item) => `<span>${store.escapeHTML(item)}</span>`).join("")}</div>
            </div>
            <div class="manager-item__actions">
              <button type="button" data-move-up="${store.escapeHTML(work.id)}" aria-label="Move ${store.escapeHTML(work.title)} up" ${realIndex === 0 ? "disabled" : ""}>↑</button>
              <button type="button" data-move-down="${store.escapeHTML(work.id)}" aria-label="Move ${store.escapeHTML(work.title)} down" ${realIndex === data.works.length - 1 ? "disabled" : ""}>↓</button>
              <button type="button" data-duplicate-work="${store.escapeHTML(work.id)}">Duplicate</button>
              <button class="action-primary" type="button" data-edit-work="${store.escapeHTML(work.id)}">Edit</button>
              <button class="action-danger" type="button" data-delete-work="${store.escapeHTML(work.id)}">Delete</button>
            </div>
          </article>
        `;
      }).join("");
    }

    function setFormValue(name, value) {
      const field = form.elements.namedItem(name);
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(value);
      else field.value = value ?? "";
    }

    function openEditor(work) {
      const item = work || {
        id: "",
        title: "",
        category: "",
        status: "In Development",
        year: String(new Date().getFullYear()),
        featured: false,
        published: true,
        description: "",
        tech: [],
        link: "",
        linkLabel: ""
      };
      form.reset();
      setFormValue("originalId", item.id);
      setFormValue("title", item.title);
      setFormValue("category", item.category);
      setFormValue("status", item.status);
      setFormValue("year", item.year);
      setFormValue("description", item.description);
      setFormValue("tech", (item.tech || []).join(", "));
      setFormValue("link", item.link);
      setFormValue("linkLabel", item.linkLabel);
      setFormValue("featured", item.featured);
      setFormValue("published", item.published !== false);
      $("[data-editor-title]").textContent = work ? "Edit work" : "Add new work";
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      window.setTimeout(() => form.elements.namedItem("title")?.focus(), 40);
    }

    function closeEditor() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    function formToWork() {
      const values = new FormData(form);
      const originalId = String(values.get("originalId") || "");
      const title = String(values.get("title") || "").trim();
      return {
        originalId,
        work: {
          id: uniqueId(title, originalId),
          title,
          category: String(values.get("category") || "General").trim(),
          status: String(values.get("status") || "In Development").trim(),
          year: String(values.get("year") || new Date().getFullYear()).trim(),
          featured: values.get("featured") === "on",
          published: values.get("published") === "on",
          description: String(values.get("description") || "").trim(),
          tech: String(values.get("tech") || "").split(",").map((item) => item.trim()).filter(Boolean),
          link: String(values.get("link") || "").trim(),
          linkLabel: String(values.get("linkLabel") || "").trim()
        }
      };
    }

    function moveWork(id, direction) {
      const index = data.works.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= data.works.length) return;
      [data.works[index], data.works[target]] = [data.works[target], data.works[index]];
      persist("Project order updated.");
    }

    function duplicateWork(id) {
      const source = data.works.find((item) => item.id === id);
      if (!source) return;
      const copy = clone(source);
      copy.title = `${source.title} Copy`;
      copy.id = uniqueId(copy.title, "");
      copy.featured = false;
      const index = data.works.findIndex((item) => item.id === id);
      data.works.splice(index + 1, 0, copy);
      persist("Project duplicated.");
    }

    function deleteWork(id) {
      const work = data.works.find((item) => item.id === id);
      if (!work) return;
      if (!window.confirm(`Delete “${work.title}” from this local draft?`)) return;
      data.works = data.works.filter((item) => item.id !== id);
      persist("Project removed from the local draft.");
    }

    function download(filename, content, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function exportData(format) {
      data.updated = monthYear();
      if (format === "json") {
        download("klightten-portfolio-data.json", `${JSON.stringify(data, null, 2)}\n`, "application/json");
      } else {
        download("portfolio-data.js", `window.KLIGHTTEN_PORTFOLIO = ${JSON.stringify(data, null, 2)};\n`, "text/javascript");
      }
      toast(format === "json" ? "JSON backup downloaded." : "Publish-ready data file downloaded.");
    }

    async function importData(file) {
      if (!file) return;
      try {
        const text = await file.text();
        let parsed;
        if (file.name.toLowerCase().endsWith(".js")) {
          const match = text.match(/window\.KLIGHTTEN_PORTFOLIO\s*=\s*([\s\S]*?);?\s*$/);
          if (!match) throw new Error("The JavaScript data wrapper was not recognized.");
          parsed = JSON.parse(match[1]);
        } else {
          parsed = JSON.parse(text);
        }
        if (!parsed || !Array.isArray(parsed.works) || !parsed.profile) throw new Error("This is not a Klightten portfolio data file.");
        data = parsed;
        persist("Portfolio data imported successfully.");
      } catch (error) {
        toast(error.message || "Could not import that file.", "error");
      } finally {
        importInput.value = "";
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const { originalId, work } = formToWork();
      if (!work.title || !work.category || !work.status || !work.description) {
        toast("Please complete the required fields.", "error");
        return;
      }
      const index = data.works.findIndex((item) => item.id === originalId);
      if (index >= 0) data.works[index] = work;
      else data.works.unshift(work);
      persist(index >= 0 ? "Project updated." : "New project added.");
      closeEditor();
    });

    search?.addEventListener("input", (event) => {
      query = event.target.value.trim().toLowerCase();
      render();
    });

    importInput?.addEventListener("change", (event) => importData(event.target.files?.[0]));

    document.addEventListener("click", (event) => {
      const target = event.target;
      const add = target.closest("[data-add-work]");
      const edit = target.closest("[data-edit-work]");
      const duplicate = target.closest("[data-duplicate-work]");
      const remove = target.closest("[data-delete-work]");
      const up = target.closest("[data-move-up]");
      const down = target.closest("[data-move-down]");
      const close = target.closest("[data-close-editor]");
      const exportJs = target.closest("[data-export-js]");
      const exportJson = target.closest("[data-export-json]");
      const reset = target.closest("[data-reset-data]");

      if (add) openEditor();
      if (edit) openEditor(data.works.find((item) => item.id === edit.dataset.editWork));
      if (duplicate) duplicateWork(duplicate.dataset.duplicateWork);
      if (remove) deleteWork(remove.dataset.deleteWork);
      if (up) moveWork(up.dataset.moveUp, -1);
      if (down) moveWork(down.dataset.moveDown, 1);
      if (close) closeEditor();
      if (exportJs) exportData("js");
      if (exportJson) exportData("json");
      if (reset && window.confirm("Discard every local edit and return to the bundled portfolio data?")) {
        store.reset();
        data = store.defaults();
        render();
        toast("Local draft cleared. Published data restored.");
      }
    });

    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) closeEditor();
    });

    window.addEventListener("klightten:data-change", () => {
      data = store.read();
      render();
    });

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initManager);
  else initManager();
})();
