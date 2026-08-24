(() => {
  const CONFIG_PATH = "resources/js/sudochat-config.json";
  let endpointPromise = null;

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
          console.warn("SudoChat question logging configuration unavailable", error);
          return "";
        }
      })();
    }

    return endpointPromise;
  }

  async function logQuestion(question) {
    const endpoint = await getLoggingEndpoint();
    if (!endpoint) return;

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({ question })
      });
    } catch (error) {
      // Logging is deliberately non-blocking: a telemetry failure must never stop
      // the visitor from asking SudoChat a question.
      console.warn("SudoChat question logging failed", error);
    }
  }

  function setup() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    if (!form || !input) return;

    // Capture runs before the main submit handler clears the textarea.
    form.addEventListener("submit", () => {
      const question = input.value.trim();
      if (!question) return;
      void logQuestion(question);
    }, { capture: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
