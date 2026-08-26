(() => {
  const CONFIG_PATH = "resources/js/sudochat-config.json";
  const VISITOR_KEY = "sudochat.analytics.visitor.v1";
  const SESSION_KEY = "sudochat.analytics.session.v1";
  const SOURCE_KEY = "sudochat.analytics.source.v1";
  const MAX_SOURCE_LENGTH = 64;
  let endpointPromise = null;
  let currentTurn = null;

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function getOrCreate(storage, key, prefix) {
    try {
      const existing = storage.getItem(key);
      if (existing) return existing;
      const created = createId(prefix);
      storage.setItem(key, created);
      return created;
    } catch {
      return createId(prefix);
    }
  }

  function normaliseSource(value) {
    return String(value || "")
      .trim()
      .slice(0, MAX_SOURCE_LENGTH)
      .replace(/[^a-zA-Z0-9._-]/g, "-");
  }

  function getSourceLabel() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tagged = normaliseSource(params.get("source") || params.get("audience"));
      if (tagged) {
        sessionStorage.setItem(SOURCE_KEY, tagged);
        return tagged;
      }
      return normaliseSource(sessionStorage.getItem(SOURCE_KEY)) || "untagged";
    } catch {
      return "untagged";
    }
  }

  const visitorId = getOrCreate(localStorage, VISITOR_KEY, "visitor");
  const sessionId = getOrCreate(sessionStorage, SESSION_KEY, "session");
  const source = getSourceLabel();

  function deriveLoggingEndpoint(tokenEndpoint) {
    try {
      const tokenUrl = new URL(tokenEndpoint, window.location.href);
      return new URL("/api/log-question", tokenUrl.origin).toString();
    } catch {
      return "";
    }
  }

  async function getLoggingEndpoint() {
    if (!endpointPromise) {
      endpointPromise = (async () => {
        const inline = window.SUDOCHAT_CONFIG || {};
        if (inline.logQuestionEndpoint) return String(inline.logQuestionEndpoint);

        try {
          const response = await fetch(CONFIG_PATH, { cache: "no-store", credentials: "omit" });
          if (!response.ok) return "";
          const config = await response.json();
          if (config.logQuestionEndpoint) return String(config.logQuestionEndpoint);
          return deriveLoggingEndpoint(config.tokenEndpoint || "");
        } catch (error) {
          console.warn("SudoChat analytics configuration unavailable", error);
          return "";
        }
      })();
    }

    return endpointPromise;
  }

  async function logEvent(eventType, payload) {
    const endpoint = await getLoggingEndpoint();
    if (!endpoint) return;

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({
          eventType,
          visitorId,
          sessionId,
          source,
          ...payload
        })
      });
    } catch (error) {
      // Analytics must never interfere with the visitor's chat request.
      console.warn("SudoChat analytics logging failed", error);
    }
  }

  function startTurn(question) {
    currentTurn = {
      turnId: createId("turn"),
      question,
      startedAt: Date.now()
    };

    void logEvent("question", {
      turnId: currentTurn.turnId,
      question
    });
  }

  function finishTurn(answer, responseLabel) {
    if (!currentTurn) return;

    const turn = currentTurn;
    currentTurn = null;
    const label = String(responseLabel || "Grounded response").trim();
    const outcome = /service unavailable/i.test(label) ? "error" : "answered";

    void logEvent(outcome === "answered" ? "answer" : "error", {
      turnId: turn.turnId,
      question: turn.question,
      answer: String(answer || "").trim(),
      responseLabel: label,
      outcome,
      durationMs: Math.max(0, Date.now() - turn.startedAt)
    });
  }

  function observeAnswers() {
    const conversation = document.getElementById("conversation");
    if (!conversation || typeof MutationObserver !== "function") return;

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const added of record.addedNodes) {
          if (!(added instanceof Element)) continue;

          const message = added.matches(".message.assistant")
            ? added
            : added.querySelector(".message.assistant");

          if (!message || message.classList.contains("thinking-message")) continue;

          const answerNode = message.querySelector("p");
          const labelNode = message.querySelector(".message-label");
          const answer = answerNode ? answerNode.textContent.trim() : "";
          const label = labelNode ? labelNode.textContent.trim() : "Grounded response";
          finishTurn(answer, label);
        }
      }
    });

    observer.observe(conversation, { childList: true, subtree: true });
  }

  function setup() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    if (!form || !input) return;

    const note = document.getElementById("composer-note");
    if (note) {
      note.textContent = "Questions and responses may be logged with pseudonymous session identifiers to improve SudoChat. Do not submit sensitive or confidential information.";
    }

    // Capture runs before the main submit handler clears the textarea.
    form.addEventListener("submit", () => {
      const question = input.value.trim();
      if (!question) return;
      startTurn(question);
    }, { capture: true });

    observeAnswers();
  }

  window.SudoChatAnalytics = {
    visitorId,
    sessionId,
    source
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
