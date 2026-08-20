(() => {
  const config = {
    endpoint: window.SUDOCHAT_ENDPOINT || "",
    githubRepo: "SudoQui/MyWebsite",
    githubPath: "sudochat.html"
  };

  const shell = document.getElementById("sudochat-shell");
  const chatView = document.getElementById("chat-view");
  const engineView = document.getElementById("engine-view");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");
  const conversation = document.getElementById("conversation");
  const modeButtons = document.querySelectorAll("[data-mode]");
  const promptButtons = document.querySelectorAll("[data-prompt]");
  const componentButtons = document.querySelectorAll("[data-component]");
  const componentSummary = document.getElementById("component-summary");

  const architectureDetails = {
    frontend: "Custom web UI on mustafa-siddiqui.com. The public portfolio still works if the AI service is unavailable.",
    gateway: "A server-side gateway validates requests, applies limits and keeps Copilot credentials out of browser code.",
    agent: "Copilot Studio handles conversational orchestration and grounded response behaviour.",
    knowledge: "Curated public knowledge covers Mustafa, projects, authored answers, role research and supporting evidence.",
    guardrails: "The agent abstains when evidence is weak, rejects false premises and keeps Court proposals clearly independent.",
    retrieval: "The final retrieval layer adds hybrid search, metadata filters, freshness controls and deterministic provenance.",
    evaluation: "Evaluation measures grounding, retrieval quality, citation accuracy, abstention and prompt-injection resistance.",
    response: "Responses combine a grounded answer with approved public source links to portfolio pages, GitHub and evidence."
  };

  function setView(mode) {
    const showEngine = mode === "engine";
    shell.dataset.view = showEngine ? "engine" : "chat";

    if (chatView && engineView) {
      chatView.style.pointerEvents = showEngine ? "none" : "auto";
      engineView.style.pointerEvents = showEngine ? "auto" : "none";
      chatView.setAttribute("aria-hidden", String(showEngine));
      engineView.setAttribute("aria-hidden", String(!showEngine));
    }
  }

  function setPrompt(text) {
    setView("chat");
    input.value = text;
    resizeInput();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  modeButtons.forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setView(button.dataset.mode || "chat");
  }));

  promptButtons.forEach((button) => button.addEventListener("click", () => setPrompt(button.dataset.prompt || "")));
  componentButtons.forEach((button) => button.addEventListener("click", () => {
    componentSummary.textContent = architectureDetails[button.dataset.component] || "Select a component to inspect its responsibility.";
  }));

  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    setView("chat");
    shell.classList.add("has-chat");
    addMessage("user", "You", question);
    input.value = "";
    resizeInput();
    setBusy(true);

    try {
      if (!config.endpoint) {
        addMessage("assistant", "SudoChat MVP", "The interface is live, but the grounded Copilot backend is not connected yet. This fallback is deliberately transparent rather than pretending to be an AI response.");
        return;
      }

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ message: question })
      });
      if (!response.ok) throw new Error(`Chat request failed with status ${response.status}`);
      const payload = await response.json();
      addMessage("assistant", payload.provenance || "Grounded response", payload.answer || "No grounded answer was returned.", Array.isArray(payload.sources) ? payload.sources : []);
    } catch (error) {
      console.error(error);
      addMessage("assistant", "Service unavailable", "The live agent could not be reached. The portfolio and Engine Room remain available while the AI service is unavailable.");
    } finally {
      setBusy(false);
      input.focus();
    }
  });

  function addMessage(role, label, text, sources = []) {
    const node = document.createElement("article");
    node.className = `message ${role}`;
    const safeSources = sources
      .filter((source) => source && source.label && isAllowedUrl(source.url))
      .map((source) => `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a>`)
      .join("");
    node.innerHTML = `<span class="message-label">${escapeHtml(label)}</span><p>${escapeHtml(text)}</p>${safeSources ? `<div class="source-list">${safeSources}</div>` : ""}`;
    conversation.appendChild(node);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function setBusy(busy) {
    sendButton.disabled = busy;
    input.disabled = busy;
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 58)}px`;
  }

  function isAllowedUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch { return false; }
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) { return escapeHtml(value); }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unavailable";
    return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Sydney" }).format(date);
  }

  function extractLastPage(linkHeader) {
    if (!linkHeader) return null;
    const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    return match ? Number(match[1]) : null;
  }

  async function loadGitHubTimeline() {
    const start = document.getElementById("project-start");
    const latest = document.getElementById("project-latest");
    const base = `https://api.github.com/repos/${config.githubRepo}/commits?path=${encodeURIComponent(config.githubPath)}&per_page=1`;
    try {
      const latestResponse = await fetch(base, { headers: { Accept: "application/vnd.github+json" } });
      if (!latestResponse.ok) throw new Error("GitHub timeline unavailable");
      const latestItems = await latestResponse.json();
      if (!latestItems.length) throw new Error("No commits found");
      latest.textContent = formatDate(latestItems[0].commit.committer.date);
      const lastPage = extractLastPage(latestResponse.headers.get("Link"));
      if (!lastPage) { start.textContent = latest.textContent; return; }
      const firstResponse = await fetch(`${base}&page=${lastPage}`, { headers: { Accept: "application/vnd.github+json" } });
      const firstItems = firstResponse.ok ? await firstResponse.json() : [];
      start.textContent = firstItems.length ? `Started ${formatDate(firstItems[firstItems.length - 1].commit.committer.date)}` : "View GitHub history";
    } catch (error) {
      console.warn(error);
      start.textContent = "View GitHub history";
      latest.textContent = "unavailable";
    }
  }

  setView(shell.dataset.view || "chat");
  resizeInput();
  loadGitHubTimeline();
})();
