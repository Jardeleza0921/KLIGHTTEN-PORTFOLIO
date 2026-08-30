(function () {
  "use strict";

  const CONFIG = Object.freeze({
    repository: "Jardeleza0921/KLIGHTTEN-PORTFOLIO",
    branch: "main",
    path: "assets/portfolio-data.js",
    liveUrl: "https://jardeleza0921.netlify.app/"
  });
  const TOKEN_KEY = "klightten_github_token_session";
  const API_VERSION = "2022-11-28";

  function initPublisher() {
    const store = window.KlighttenPortfolio;
    const panel = document.querySelector("[data-github-publisher]");
    if (!store || !panel) return;

    const tokenInput = panel.querySelector("[data-github-token]");
    const connectButton = panel.querySelector("[data-github-connect]");
    const disconnectButton = panel.querySelector("[data-github-disconnect]");
    const loadButton = panel.querySelector("[data-github-load]");
    const publishButton = panel.querySelector("[data-github-publish]");
    const messageInput = panel.querySelector("[data-commit-message]");
    const status = panel.querySelector("[data-github-status]");
    const account = panel.querySelector("[data-github-account]");
    const result = panel.querySelector("[data-publish-result]");
    let token = sessionStorage.getItem(TOKEN_KEY) || "";
    let username = "";

    function setBusy(isBusy, activeLabel) {
      [connectButton, disconnectButton, loadButton, publishButton].forEach((button) => {
        if (button) button.disabled = isBusy;
      });
      panel.dataset.busy = String(isBusy);
      if (isBusy && activeLabel) setStatus(activeLabel, "working");
    }

    function setStatus(message, tone) {
      status.textContent = message;
      status.dataset.tone = tone || "neutral";
    }

    function setConnected(isConnected, name) {
      panel.dataset.connected = String(isConnected);
      username = isConnected ? name : "";
      account.textContent = isConnected ? `Connected as ${name}` : "Not connected";
      connectButton.hidden = isConnected;
      disconnectButton.hidden = !isConnected;
      loadButton.disabled = !isConnected;
      publishButton.disabled = !isConnected;
      setStatus(isConnected ? "GitHub ready" : "GitHub connection required", isConnected ? "success" : "neutral");
    }

    function headers() {
      return {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": API_VERSION
      };
    }

    async function github(path, options) {
      const response = await fetch(`https://api.github.com${path}`, {
        ...options,
        headers: { ...headers(), ...(options && options.headers) }
      });
      let body = {};
      try { body = await response.json(); } catch (_error) { /* Empty GitHub response. */ }
      if (!response.ok) {
        const detail = body.message || `GitHub returned ${response.status}`;
        if (response.status === 401) throw new Error("The token is invalid or expired.");
        if (response.status === 403) throw new Error("The token needs Contents: Read and write permission for this repository.");
        if (response.status === 404) throw new Error("Repository access was not found. Check the selected repository on the token.");
        throw new Error(detail);
      }
      return body;
    }

    function toBase64(text) {
      const bytes = new TextEncoder().encode(text);
      let binary = "";
      const size = 0x8000;
      for (let index = 0; index < bytes.length; index += size) {
        binary += String.fromCharCode(...bytes.subarray(index, index + size));
      }
      return btoa(binary);
    }

    function fromBase64(value) {
      const binary = atob(String(value || "").replace(/\s/g, ""));
      return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
    }

    function serialize(data) {
      return `window.KLIGHTTEN_PORTFOLIO = ${JSON.stringify(data, null, 2)};\n`;
    }

    function parseDataFile(source) {
      const match = source.match(/window\.KLIGHTTEN_PORTFOLIO\s*=\s*([\s\S]*?);?\s*$/);
      if (!match) throw new Error("The GitHub data file format was not recognized.");
      const parsed = JSON.parse(match[1]);
      if (!parsed || !parsed.profile || !Array.isArray(parsed.works)) {
        throw new Error("The GitHub file is not valid Klightten portfolio data.");
      }
      return parsed;
    }

    function updatedDate() {
      return new Intl.DateTimeFormat("en", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(new Date());
    }

    function showResult(commitUrl) {
      result.replaceChildren();
      const text = document.createElement("span");
      text.textContent = "Published successfully. GitHub and Netlify are rebuilding the site.";
      const commit = document.createElement("a");
      commit.href = commitUrl;
      commit.target = "_blank";
      commit.rel = "noreferrer";
      commit.textContent = "View commit ↗";
      const live = document.createElement("a");
      live.href = CONFIG.liveUrl;
      live.target = "_blank";
      live.rel = "noreferrer";
      live.textContent = "Open live portfolio ↗";
      result.append(text, commit, live);
      result.hidden = false;
    }

    async function connect(silent) {
      const candidate = String(tokenInput.value || token || "").trim();
      if (!candidate) {
        setStatus("Paste your fine-grained GitHub token first.", "error");
        tokenInput.focus();
        return;
      }
      token = candidate;
      setBusy(true, "Checking GitHub access…");
      try {
        const user = await github("/user");
        await github(`/repos/${CONFIG.repository}`);
        sessionStorage.setItem(TOKEN_KEY, token);
        tokenInput.value = "";
        tokenInput.placeholder = "Token is active for this tab";
        setConnected(true, user.login || "GitHub user");
        if (!silent) setStatus("Connected securely for this browser tab.", "success");
      } catch (error) {
        token = "";
        sessionStorage.removeItem(TOKEN_KEY);
        setConnected(false, "");
        setStatus(error.message || "Could not connect to GitHub.", "error");
      } finally {
        setBusy(false);
        if (username) {
          loadButton.disabled = false;
          publishButton.disabled = false;
        }
      }
    }

    function disconnect() {
      token = "";
      username = "";
      sessionStorage.removeItem(TOKEN_KEY);
      tokenInput.value = "";
      tokenInput.placeholder = "github_pat_…";
      result.hidden = true;
      setConnected(false, "");
      setStatus("Token forgotten from this tab.", "neutral");
    }

    async function fetchDataFile() {
      return github(`/repos/${CONFIG.repository}/contents/${CONFIG.path}?ref=${encodeURIComponent(CONFIG.branch)}`);
    }

    async function loadFromGitHub() {
      if (!token) return;
      if (store.hasDraft() && !window.confirm("Replace your current browser draft with the published GitHub library?")) return;
      setBusy(true, "Loading the published library…");
      try {
        const file = await fetchDataFile();
        const data = parseDataFile(fromBase64(file.content));
        store.write(data);
        setStatus("Published GitHub library loaded into the editor.", "success");
      } catch (error) {
        setStatus(error.message || "Could not load the GitHub library.", "error");
      } finally {
        setBusy(false);
        if (username) {
          loadButton.disabled = false;
          publishButton.disabled = false;
        }
      }
    }

    async function publish() {
      if (!token) return;
      const data = store.read();
      const total = Array.isArray(data.works) ? data.works.length : 0;
      if (!window.confirm(`Publish ${total} library entries to GitHub now?`)) return;
      data.version = Math.max(Number(data.version) || 1, 3);
      data.updated = updatedDate();
      const message = String(messageInput.value || "Update portfolio library").trim() || "Update portfolio library";
      setBusy(true, "Creating the GitHub commit…");
      result.hidden = true;
      try {
        const current = await fetchDataFile();
        const response = await github(`/repos/${CONFIG.repository}/contents/${CONFIG.path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            content: toBase64(serialize(data)),
            sha: current.sha,
            branch: CONFIG.branch
          })
        });
        store.write(data);
        setStatus("Published to GitHub successfully.", "success");
        showResult(response.commit && response.commit.html_url
          ? response.commit.html_url
          : `https://github.com/${CONFIG.repository}/commits/${CONFIG.branch}`);
      } catch (error) {
        setStatus(error.message || "GitHub publishing failed.", "error");
      } finally {
        setBusy(false);
        if (username) {
          loadButton.disabled = false;
          publishButton.disabled = false;
        }
      }
    }

    connectButton.addEventListener("click", () => connect(false));
    disconnectButton.addEventListener("click", disconnect);
    loadButton.addEventListener("click", loadFromGitHub);
    publishButton.addEventListener("click", publish);
    tokenInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        connect(false);
      }
    });

    setConnected(false, "");
    if (token) connect(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPublisher);
  else initPublisher();
})();
