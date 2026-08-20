(() => {
  const config = {
    endpoint: window.SUDOCHAT_ENDPOINT || "",
    githubRepo: "SudoQui/MyWebsite",
    githubPath: "sudochat.html"
  };

  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");
  const landing = document.getElementById("landing-state");
  const conversation = document.getElementById("conversation");
  const shell = document.getElementById("sudochat-shell");
  const stage = shell.querySelector(".flip-stage");
  const chatView = document.getElementById("chat-view");
  const engineView = document.getElementById("engine-view");
  const modeButtons = document.querySelectorAll("[data-mode]");
  const promptButtons = document.querySelectorAll("[data-prompt]");
  const componentButtons = document.querySelectorAll("[data-component]");
  const componentPanel = document.getElementById("component-panel");

  const architectureDetails = {
    frontend: {
      title: "Custom Web UI",
      status: "MVP",
      body: "The public experience lives on mustafa-siddiqui.com. It remains usable even if the AI service is unavailable. Suggested prompts populate the composer first so the visitor stays in control before sending."
    },
    gateway: {
      title: "Secure Chat Gateway",
      status: "MVP",
      body: "A server side endpoint keeps Copilot credentials and tokens out of browser code, validates request size, applies rate limits and restricts cross origin access to the portfolio domain."
    },
    agent: {
      title: "Copilot Studio Agent",
      status: "MVP",
      body: "Copilot Studio handles conversational orchestration. System instructions require grounded answers, transparent gaps and refusal to invent unsupported claims."
    },
    knowledge: {
      title: "Curated Knowledge Base",
      status: "MVP",
      body: "The MVP knowledge base contains Mustafa's profile, selected experience, projects, authored interview answers, Court role research and an explanation of SudoChat itself. Public evidence links point back to the portfolio and GitHub."
    },
    retrieval: {
      title: "Retrieval Service",
      status: "Final",
      body: "The final architecture adds hybrid semantic and keyword retrieval with metadata filters. Documents carry source IDs, answer type, review date, public status and canonical evidence URLs so provenance is deterministic rather than improvised by the model."
    },
    guardrails: {
      title: "Guardrails",
      status: "MVP",
      body: "The agent abstains when evidence is insufficient, distinguishes Mustafa's authored perspective from verified facts, does not infer sensitive personal information and never presents independent Court proposals as Court endorsed."
    },
    evaluation: {
      title: "Evaluation Harness",
      status: "Final",
      body: "Automated and manual tests measure grounded answer rate, retrieval accuracy, citation accuracy, abstention accuracy, prompt injection resistance and role alignment. The application release starts with a smaller critical test set."
    },
    observability: {
      title: "Observability",
      status: "Final",
      body: "Production telemetry records latency, service failures, retrieval misses and quality signals without storing unnecessary personal data. Secrets and raw private knowledge are never exposed to the browser."
    },
    response: {
      title: "Grounded Response and Evidence",
      status: "MVP",
      body: "Answers should expose evidence as structured links that open in a new tab. The final system labels responses as verified evidence, Mustafa's authored perspective, synthesis or insufficient evidence."
    }
  };

  function setPrompt(text) {
    input.value = text;
    resizeInput();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function syncStageHeight(mode = shell.dataset.view || "chat") {
    const face = mode === "engine" ? engineView : chatView;
    requestAnimationFrame(() => {
      stage.style.height = `${face.scrollHeight}px`;
    });
  }

  function setView(mode) {
    const isEngine = mode === "engine";
    shell.dataset.view = isEngine ? "engine" : "chat";
    modeButtons.forEach((item) => {
      const active = item.dataset.mode === mode;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    syncStageHeight(mode);
  }

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setView("chat");
      setPrompt(button.dataset.prompt || "");
    });
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setView(button.dataset.mode || "chat");
    });
  });

  componentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const detail = architectureDetails[button.dataset.component];
      if (!detail) return;
      componentPanel.innerHTML = `
        <p class="panel-kicker">${escapeHtml(detail.status)} architecture</p>
        <h3>${escapeHtml(detail.title)}</h3>
        <p>${escapeHtml(detail.body)}</p>
      `;
      syncStageHeight("engine");
    });
  });

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
    collapseLanding();
    addMessage("user", "You", question);
    input.value = "";
    resizeInput();
    setBusy(true);

    try {
      if (!config.endpoint) {
        addMessage(
          "assistant",
          "SudoChat MVP",
          "The custom interface is ready, but the live grounded Copilot backend has not been connected to this repository build yet. This fallback is deliberately transparent rather than pretending to be an AI response. Flip to Engine Room to inspect the architecture behind the planned agent."
        );
        return;
      }

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ message: question })
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const payload = await response.json();
      addMessage(
        "assistant",
        payload.provenance || "Grounded response",
        payload.answer || "No grounded answer was returned.",
        Array.isArray(payload.sources) ? payload.sources : []
      );
    } catch (error) {
      console.error(error);
      addMessage(
        "assistant",
        "Service unavailable",
        "The live agent could not be reached. The portfolio, evidence and Engine Room remain available while the AI service is unavailable."
      );
    } finally {
      setBusy(false);
      input.focus();
    }
  });

  function collapseLanding() {
    landing.classList.add("is-collapsed");
    conversation.classList.add("is-active");
    syncStageHeight("chat");
  }

  function addMessage(role, label, text, sources = []) {
    const node = document.createElement("article");
    node.className = `message ${role}`;

    const safeSources = sources
      .filter((source) => source && source.label && isAllowedUrl(source.url))
      .map(
        (source) =>
          `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a>`
      )
      .join("");

    node.innerHTML = `
      <span class="message-label">${escapeHtml(label)}</span>
      <p>${escapeHtml(text)}</p>
      ${safeSources ? `<div class="source-list">${safeSources}</div>` : ""}
    `;
    conversation.appendChild(node);
    syncStageHeight("chat");
    node.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function setBusy(busy) {
    sendButton.disabled = busy;
    input.disabled = busy;
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
    syncStageHeight("chat");
  }

  function isAllowedUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unavailable";
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Sydney"
    }).format(date);
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
      const latestResponse = await fetch(base, {
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!latestResponse.ok) throw new Error("GitHub timeline unavailable");

      const latestItems = await latestResponse.json();
      if (!latestItems.length) throw new Error("No SudoChat commits found");

      latest.textContent = formatDate(latestItems[0].commit.committer.date);

      const lastPage = extractLastPage(latestResponse.headers.get("Link"));
      if (!lastPage) {
        start.textContent = latest.textContent;
        return;
      }

      const firstResponse = await fetch(`${base}&page=${lastPage}`, {
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!firstResponse.ok) throw new Error("Initial commit unavailable");

      const firstItems = await firstResponse.json();
      start.textContent = firstItems.length
        ? formatDate(firstItems[firstItems.length - 1].commit.committer.date)
        : "See GitHub history";
    } catch (error) {
      console.warn(error);
      start.textContent = "See GitHub history";
      latest.textContent = "See GitHub history";
    } finally {
      syncStageHeight(shell.dataset.view || "chat");
    }
  }

  window.addEventListener("resize", () => syncStageHeight());
  resizeInput();
  syncStageHeight("chat");
  loadGitHubTimeline();
})();
