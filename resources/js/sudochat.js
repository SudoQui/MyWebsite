(() => {
  const baseConfig = {
    gatewayEndpoint: window.SUDOCHAT_ENDPOINT || "",
    tokenEndpoint: "",
    githubRepo: "SudoQui/MyWebsite",
    githubPath: "sudochat.html"
  };

  const DIRECT_LINE_BASE = "https://directline.botframework.com/v3/directline";
  const CONFIG_PATH = "resources/js/sudochat-config.json";
  const RESPONSE_TIMEOUT_MS = 75000;
  const POLL_INTERVAL_MS = 700;
  const FINAL_SETTLE_MS = 2200;
  const SHORT_FINAL_SETTLE_MS = 3500;

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

  const directLine = {
    token: "",
    conversationId: "",
    watermark: null,
    expiresAt: 0,
    userId: createUserId()
  };

  let runtimeConfigPromise = null;
  let thinkingNode = null;
  let thinkingTimer = null;

  const architectureDetails = {
    frontend: "Custom web UI on mustafa-siddiqui.com. The public portfolio still works if the AI service is unavailable.",
    gateway: "The MVP uses a short-lived Direct Line conversation token issued by Copilot Studio. Direct Line secrets are never stored in browser code. A server-side gateway can add rate limits and additional controls later.",
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
    if (!chatView || !engineView) return;
    chatView.style.pointerEvents = showEngine ? "none" : "auto";
    engineView.style.pointerEvents = showEngine ? "auto" : "none";
    chatView.setAttribute("aria-hidden", String(showEngine));
    engineView.setAttribute("aria-hidden", String(!showEngine));
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
    showThinkingIndicator("Connecting to the grounded agent");

    try {
      const config = await getRuntimeConfig();
      if (!config.gatewayEndpoint && !config.tokenEndpoint) {
        removeThinkingIndicator();
        addMessage("assistant", "SudoChat MVP", "The interface is ready for the live Copilot agent, but its public token endpoint has not been configured yet.");
        return;
      }

      const payload = config.gatewayEndpoint
        ? await requestViaGateway(config.gatewayEndpoint, question)
        : await requestViaDirectLine(config.tokenEndpoint, question);

      removeThinkingIndicator();
      addMessage(
        "assistant",
        payload.provenance || "Grounded response",
        payload.answer || "No grounded answer was returned.",
        Array.isArray(payload.sources) ? payload.sources : []
      );
    } catch (error) {
      console.error("SudoChat request failed", error);
      resetDirectLineSession();
      removeThinkingIndicator();
      addMessage("assistant", "Service unavailable", "The live agent could not be reached. The portfolio and Engine Room remain available while the AI service is unavailable.");
    } finally {
      removeThinkingIndicator();
      setBusy(false);
      input.focus();
    }
  });

  async function getRuntimeConfig() {
    if (!runtimeConfigPromise) {
      runtimeConfigPromise = (async () => {
        const inline = window.SUDOCHAT_CONFIG || {};
        let fileConfig = {};
        try {
          const response = await fetch(CONFIG_PATH, { cache: "no-store" });
          if (response.ok) fileConfig = await response.json();
        } catch (error) {
          console.warn("SudoChat runtime config file unavailable", error);
        }
        return {
          ...baseConfig,
          ...fileConfig,
          ...inline,
          gatewayEndpoint: inline.gatewayEndpoint || fileConfig.gatewayEndpoint || baseConfig.gatewayEndpoint || "",
          tokenEndpoint: inline.tokenEndpoint || fileConfig.tokenEndpoint || ""
        };
      })();
    }
    return runtimeConfigPromise;
  }

  async function requestViaGateway(endpoint, question) {
    updateThinkingIndicator("Retrieving grounded evidence");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({ message: question })
    });
    if (!response.ok) throw new Error(`Gateway request failed with status ${response.status}`);
    updateThinkingIndicator("Formulating grounded response");
    return response.json();
  }

  async function requestViaDirectLine(tokenEndpoint, question) {
    updateThinkingIndicator("Connecting to the grounded agent");
    await ensureDirectLineSession(tokenEndpoint);
    await ensureFreshToken();

    // Advance past any late activity left over from a completed prior turn. This
    // prevents a delayed response from being attached to the next user message.
    await drainCurrentActivities();

    updateThinkingIndicator("Retrieving grounded evidence");
    const turnStartedAt = Date.now();
    const sendResponse = await fetch(`${DIRECT_LINE_BASE}/conversations/${encodeURIComponent(directLine.conversationId)}/activities`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${directLine.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "message",
        from: { id: directLine.userId, name: "SudoChat visitor" },
        text: question,
        textFormat: "plain",
        locale: "en-AU"
      })
    });

    if (!sendResponse.ok) throw new Error(`Direct Line send failed with status ${sendResponse.status}`);

    let sendPayload = {};
    try { sendPayload = await sendResponse.json(); } catch { sendPayload = {}; }

    updateThinkingIndicator("Formulating grounded response");
    return waitForAgentResponse(sendPayload.id || "", turnStartedAt);
  }

  async function ensureDirectLineSession(tokenEndpoint) {
    if (directLine.token && directLine.conversationId) return;

    const tokenResponse = await fetch(tokenEndpoint, { method: "GET", cache: "no-store", credentials: "omit" });
    if (!tokenResponse.ok) throw new Error(`Copilot token endpoint failed with status ${tokenResponse.status}`);

    const tokenPayload = await tokenResponse.json();
    if (!tokenPayload.token) throw new Error("Copilot token endpoint did not return a Direct Line token");

    directLine.token = tokenPayload.token;
    directLine.expiresAt = Date.now() + (Number(tokenPayload.expires_in || 1800) * 1000);

    const conversationResponse = await fetch(`${DIRECT_LINE_BASE}/conversations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${directLine.token}`, "Content-Type": "application/json" },
      body: "{}"
    });
    if (!conversationResponse.ok) throw new Error(`Direct Line conversation start failed with status ${conversationResponse.status}`);

    const conversationPayload = await conversationResponse.json();
    directLine.conversationId = conversationPayload.conversationId || tokenPayload.conversationId || "";
    directLine.expiresAt = Date.now() + (Number(conversationPayload.expires_in || tokenPayload.expires_in || 1800) * 1000);
    directLine.watermark = null;
    if (!directLine.conversationId) throw new Error("Direct Line did not return a conversation ID");

    await drainCurrentActivities();
  }

  async function ensureFreshToken() {
    if (!directLine.token || !directLine.conversationId) return;
    if (Date.now() < directLine.expiresAt - 120000) return;

    const response = await fetch(`${DIRECT_LINE_BASE}/tokens/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${directLine.token}` }
    });
    if (!response.ok) throw new Error(`Direct Line token refresh failed with status ${response.status}`);

    const payload = await response.json();
    directLine.token = payload.token || directLine.token;
    directLine.expiresAt = Date.now() + (Number(payload.expires_in || 1800) * 1000);
  }

  async function drainCurrentActivities() {
    try {
      const set = await getActivities();
      if (set && set.watermark !== undefined && set.watermark !== null) directLine.watermark = set.watermark;
    } catch (error) {
      console.warn("Could not establish Direct Line watermark", error);
    }
  }

  async function waitForAgentResponse(userActivityId = "", turnStartedAt = Date.now()) {
    const deadline = Date.now() + RESPONSE_TIMEOUT_MS;
    const finalCandidates = new Map();
    let lastCandidateAt = 0;
    let sawProvisional = false;

    while (Date.now() < deadline) {
      await ensureFreshToken();
      const set = await getActivities();
      const activities = Array.isArray(set.activities) ? set.activities : [];
      if (set.watermark !== undefined && set.watermark !== null) directLine.watermark = set.watermark;

      for (const activity of activities) {
        if (!activity || (activity.from && activity.from.id === directLine.userId)) continue;
        if (isStaleActivity(activity, turnStartedAt)) continue;

        const streamType = getStreamType(activity);
        const text = String(activity.text || activity.speak || "").trim();

        if (activity.type === "typing" || streamType === "informative" || streamType === "streaming") {
          sawProvisional = true;
          updateThinkingFromActivity(text);
          continue;
        }

        if (activity.type !== "message" || !text) continue;

        if (userActivityId && activity.replyToId && activity.replyToId !== userActivityId) {
          continue;
        }

        if (isProvisionalMessage(text)) {
          sawProvisional = true;
          updateThinkingFromActivity(text);
          continue;
        }

        const key = activity.id || `${activity.timestamp || ""}|${text}`;
        if (!finalCandidates.has(key)) {
          finalCandidates.set(key, activity);
          lastCandidateAt = Date.now();
          updateThinkingIndicator("Finalising grounded response");
        }

        if (streamType === "final") {
          return buildAgentPayload(Array.from(finalCandidates.values()));
        }
      }

      if (finalCandidates.size && lastCandidateAt) {
        const candidateActivities = Array.from(finalCandidates.values());
        const substantial = candidateActivities.some(isSubstantialAnswer);
        const settleMs = substantial ? FINAL_SETTLE_MS : SHORT_FINAL_SETTLE_MS;
        if (Date.now() - lastCandidateAt >= settleMs) {
          return buildAgentPayload(candidateActivities);
        }
      } else if (sawProvisional) {
        updateThinkingIndicator("Formulating grounded response");
      }

      await delay(POLL_INTERVAL_MS);
    }

    if (finalCandidates.size) return buildAgentPayload(Array.from(finalCandidates.values()));
    throw new Error("Timed out waiting for Copilot Studio final response");
  }

  function getStreamType(activity) {
    const entities = Array.isArray(activity.entities) ? activity.entities : [];
    for (const entity of entities) {
      if (!entity || typeof entity !== "object") continue;
      const type = String(entity.type || "").toLowerCase();
      if (type === "streaminfo" || type === "stream-info") {
        const streamType = String(entity.streamType || entity.streamtype || "").toLowerCase();
        if (streamType) return streamType;
      }
    }
    const channelType = activity.channelData && (activity.channelData.streamType || activity.channelData.streamtype);
    return channelType ? String(channelType).toLowerCase() : "";
  }

  function isStaleActivity(activity, turnStartedAt) {
    const value = activity.timestamp || activity.localTimestamp || "";
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time < turnStartedAt - 1500;
  }

  function isProvisionalMessage(text) {
    const compact = String(text).replace(/\s+/g, " ").trim();
    if (!compact || compact.length > 260) return false;
    return /^(?:i(?:'ll| will| am going to|’ll)\s+(?:search|check|look|retrieve|review|find)|let me\s+(?:search|check|look|retrieve|review|find)|(?:searching|checking|looking|retrieving|reviewing)\b|i(?:'m| am)\s+(?:searching|checking|looking|retrieving|reviewing)|i can\s+(?:search|check|look)|one moment|just a moment|working on it)/i.test(compact);
  }

  function isSubstantialAnswer(activity) {
    const text = cleanAnswerText(activity.text || activity.speak || "");
    if (text.length >= 90) return true;
    if (/\n|\[[0-9]+\]|[-•]\s/.test(text)) return true;
    if ((activity.attachments || []).length || (activity.entities || []).length) return true;
    return extractSourcesFromActivity(activity).length > 0;
  }

  function updateThinkingFromActivity(text) {
    const value = String(text || "").toLowerCase();
    if (/search|retriev|knowledge|document|evidence|source/.test(value)) {
      updateThinkingIndicator("Retrieving grounded evidence");
    } else if (/summari|formulat|draft|compose|answer/.test(value)) {
      updateThinkingIndicator("Formulating grounded response");
    } else {
      updateThinkingIndicator("Working through the grounded response");
    }
  }

  function buildAgentPayload(botMessages) {
    const answer = botMessages
      .map((activity) => cleanAnswerText(activity.text || activity.speak || ""))
      .filter(Boolean)
      .join("\n\n");
    const sources = dedupeSources(botMessages.flatMap(extractSourcesFromActivity));
    return { provenance: "Grounded response", answer, sources };
  }

  async function getActivities() {
    const watermark = directLine.watermark ? `?watermark=${encodeURIComponent(directLine.watermark)}` : "";
    const response = await fetch(`${DIRECT_LINE_BASE}/conversations/${encodeURIComponent(directLine.conversationId)}/activities${watermark}`, {
      headers: { Authorization: `Bearer ${directLine.token}` },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Direct Line receive failed with status ${response.status}`);
    return response.json();
  }

  function resetDirectLineSession() {
    directLine.token = "";
    directLine.conversationId = "";
    directLine.watermark = null;
    directLine.expiresAt = 0;
  }

  function extractSourcesFromActivity(activity) {
    const sources = [];
    const text = String(activity.text || activity.speak || "");
    const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const plainUrl = /https?:\/\/[^\s<>)\]]+/g;
    let match;

    while ((match = markdownLink.exec(text)) !== null) sources.push({ label: match[1].trim() || "Evidence", url: match[2] });
    while ((match = plainUrl.exec(text)) !== null) sources.push({ label: "Evidence", url: match[0] });

    (activity.attachments || []).forEach((attachment) => {
      if (attachment && attachment.contentUrl && isAllowedUrl(attachment.contentUrl)) {
        sources.push({ label: attachment.name || "Evidence", url: attachment.contentUrl });
      }
      if (attachment && attachment.content && typeof attachment.content === "object") collectUrlsFromObject(attachment.content, sources);
    });

    (activity.entities || []).forEach((entity) => collectUrlsFromObject(entity, sources));
    collectUrlsFromObject(activity.channelData, sources);
    collectUrlsFromObject(activity.value, sources);
    return sources;
  }

  function collectUrlsFromObject(value, sources, depth = 0) {
    if (!value || typeof value !== "object" || depth > 5) return;
    const candidateUrl = value.url || value.contentUrl || value.uri || value.href;
    if (typeof candidateUrl === "string" && isAllowedUrl(candidateUrl)) {
      sources.push({ label: value.title || value.name || value.text || value.citation || "Evidence", url: candidateUrl });
    }
    Object.values(value).forEach((child) => {
      if (child && typeof child === "object") collectUrlsFromObject(child, sources, depth + 1);
    });
  }

  function dedupeSources(sources) {
    const seen = new Set();
    return sources
      .filter((source) => {
        if (!source || !source.url || !isAllowedUrl(source.url)) return false;
        const key = source.url.trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((source) => ({ url: source.url.trim(), label: normaliseSourceLabel(source.label, source.url) }))
      .slice(0, 6);
  }

  function normaliseSourceLabel(label, url) {
    const cleaned = String(label || "").replace(/\s+/g, " ").replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim();
    if (cleaned && cleaned.toLowerCase() !== "evidence" && cleaned.length <= 72 && !/^https?:\/\//i.test(cleaned)) return cleaned;
    try {
      const parsed = new URL(url);
      const pathPart = parsed.pathname.split("/").filter(Boolean).pop();
      if (pathPart) {
        return decodeURIComponent(pathPart).replace(/[-_]+/g, " ").replace(/\.(html?|md|pdf)$/i, "").trim() || parsed.hostname;
      }
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "Evidence";
    }
  }

  function cleanAnswerText(value) {
    return String(value)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
  }

  function addMessage(role, label, text, sources = []) {
    const node = document.createElement("article");
    node.className = `message ${role}`;
    const safeSources = sources
      .filter((source) => source && source.label && isAllowedUrl(source.url))
      .map((source) => `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a>`)
      .join("");
    const safeText = escapeHtml(text).replaceAll("\n", "<br />");
    const sourceMarkup = safeSources
      ? `<div class="source-block"><span class="message-label">Sources</span><div class="source-list">${safeSources}</div></div>`
      : "";
    node.innerHTML = `<span class="message-label">${escapeHtml(label)}</span><p>${safeText}</p>${sourceMarkup}`;
    conversation.appendChild(node);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function showThinkingIndicator(message) {
    removeThinkingIndicator();
    const node = document.createElement("article");
    node.className = "message assistant thinking-message";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    node.innerHTML = `<span class="message-label">SudoChat</span><p><span data-thinking-text>${escapeHtml(message)}</span><span data-thinking-dots aria-hidden="true">.</span></p>`;
    thinkingNode = node;
    conversation.appendChild(node);
    conversation.scrollTop = conversation.scrollHeight;

    let frame = 1;
    thinkingTimer = window.setInterval(() => {
      if (!thinkingNode) return;
      const dots = thinkingNode.querySelector("[data-thinking-dots]");
      if (!dots) return;
      frame = (frame % 3) + 1;
      dots.textContent = ".".repeat(frame);
    }, 360);
  }

  function updateThinkingIndicator(message) {
    if (!thinkingNode) return showThinkingIndicator(message);
    const text = thinkingNode.querySelector("[data-thinking-text]");
    if (text) text.textContent = message;
    conversation.scrollTop = conversation.scrollHeight;
  }

  function removeThinkingIndicator() {
    if (thinkingTimer) window.clearInterval(thinkingTimer);
    thinkingTimer = null;
    if (thinkingNode && thinkingNode.parentNode) thinkingNode.parentNode.removeChild(thinkingNode);
    thinkingNode = null;
  }

  function setBusy(busy) {
    sendButton.disabled = busy;
    input.disabled = busy;
    sendButton.setAttribute("aria-busy", String(busy));
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

  function createUserId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return `sudochat-${window.crypto.randomUUID()}`;
    return `sudochat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) { return escapeHtml(value); }

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
    const base = `https://api.github.com/repos/${baseConfig.githubRepo}/commits?path=${encodeURIComponent(baseConfig.githubPath)}&per_page=1`;
    try {
      const latestResponse = await fetch(base, { headers: { Accept: "application/vnd.github+json" } });
      if (!latestResponse.ok) throw new Error("GitHub timeline unavailable");
      const latestItems = await latestResponse.json();
      if (!latestItems.length) throw new Error("No commits found");
      latest.textContent = formatDate(latestItems[0].commit.committer.date);
      const lastPage = extractLastPage(latestResponse.headers.get("Link"));
      if (!lastPage) {
        start.textContent = latest.textContent;
        return;
      }
      const firstResponse = await fetch(`${base}&page=${lastPage}`, { headers: { Accept: "application/vnd.github+json" } });
      const firstItems = firstResponse.ok ? await firstResponse.json() : [];
      start.textContent = firstItems.length
        ? `Started ${formatDate(firstItems[firstItems.length - 1].commit.committer.date)}`
        : "View GitHub history";
    } catch (error) {
      console.warn(error);
      if (start) start.textContent = "View GitHub history";
      if (latest) latest.textContent = "unavailable";
    }
  }

  setView(shell.dataset.view || "chat");
  resizeInput();
  loadGitHubTimeline();
})();
