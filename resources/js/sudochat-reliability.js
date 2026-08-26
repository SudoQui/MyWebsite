(() => {
  const CONFIG_PATH = "resources/js/sudochat-config.json";
  const DIRECT_LINE_FRAGMENT = "directline.botframework.com/v3/directline";
  const RETRY_DELAY_MS = 900;
  const DEDUPE_WINDOW_MS = 1800;

  const nativeFetch = window.fetch.bind(window);
  window.SudoChatNativeFetch = nativeFetch;
  const nativeConsoleError = console.error.bind(console);
  let telemetryEndpointPromise = null;
  const recentLogs = new Map();

  function requestUrl(input) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    return input && input.url ? String(input.url) : "";
  }

  function requestMethod(input, init) {
    if (init && init.method) return String(init.method).toUpperCase();
    if (input && input.method) return String(input.method).toUpperCase();
    return "GET";
  }

  function classifyRequest(url, method) {
    let parsed;
    try {
      parsed = new URL(url, window.location.href);
    } catch {
      return null;
    }

    if (parsed.pathname.endsWith("/api/token") && method === "GET") {
      return {
        code: "TOKEN_GATEWAY_FAILED",
        stage: "token_gateway",
        retrySafe: true
      };
    }

    if (!parsed.href.includes(DIRECT_LINE_FRAGMENT)) return null;

    if (parsed.pathname.endsWith("/tokens/refresh") && method === "POST") {
      return {
        code: "DIRECTLINE_REFRESH_FAILED",
        stage: "token_refresh",
        retrySafe: true
      };
    }

    if (parsed.pathname.endsWith("/conversations") && method === "POST") {
      return {
        code: "DIRECTLINE_START_FAILED",
        stage: "conversation_start",
        retrySafe: true
      };
    }

    if (parsed.pathname.includes("/activities") && method === "GET") {
      return {
        code: "DIRECTLINE_RECEIVE_FAILED",
        stage: "activity_receive",
        retrySafe: true
      };
    }

    if (parsed.pathname.includes("/activities") && method === "POST") {
      // Message submission is deliberately not retried automatically because a
      // lost HTTP response does not prove the activity was not accepted. Retrying
      // could send the visitor's question twice.
      return {
        code: "DIRECTLINE_SEND_FAILED",
        stage: "activity_send",
        retrySafe: false
      };
    }

    return null;
  }

  function isTransientStatus(status) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function setRetryMessage() {
    const node = document.querySelector("[data-thinking-text]");
    if (node) node.textContent = "Connection interrupted — retrying once";
  }

  function deriveTelemetryEndpoint(tokenEndpoint) {
    try {
      const tokenUrl = new URL(tokenEndpoint, window.location.href);
      return new URL("/api/log-client-error", tokenUrl.origin).toString();
    } catch {
      return "";
    }
  }

  async function getTelemetryEndpoint() {
    if (!telemetryEndpointPromise) {
      telemetryEndpointPromise = (async () => {
        const inline = window.SUDOCHAT_CONFIG || {};
        if (inline.logClientErrorEndpoint) return String(inline.logClientErrorEndpoint);

        try {
          const response = await nativeFetch(CONFIG_PATH, {
            cache: "no-store",
            credentials: "omit"
          });
          if (!response.ok) return "";
          const config = await response.json();
          if (config.logClientErrorEndpoint) return String(config.logClientErrorEndpoint);
          return deriveTelemetryEndpoint(config.tokenEndpoint || "");
        } catch {
          return "";
        }
      })();
    }

    return telemetryEndpointPromise;
  }

  async function emitClientError({ code, stage, status = null, attempt = 1, retrying = false }) {
    const key = `${code}|${stage}|${status || ""}|${retrying}`;
    const now = Date.now();
    const previous = recentLogs.get(key) || 0;
    if (now - previous < DEDUPE_WINDOW_MS) return;
    recentLogs.set(key, now);

    const endpoint = await getTelemetryEndpoint();
    if (!endpoint) return;

    try {
      await nativeFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({
          code,
          stage,
          status,
          attempt,
          retrying,
          online: typeof navigator.onLine === "boolean" ? navigator.onLine : null
        })
      });
    } catch {
      // Reliability telemetry must never interfere with the chat request itself.
    }
  }

  async function reliabilityFetch(input, init) {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const classification = classifyRequest(url, method);

    if (!classification) return nativeFetch(input, init);

    const maxAttempts = classification.retrySafe ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await nativeFetch(input, init);
        if (response.ok) return response;

        const retrying = attempt < maxAttempts && isTransientStatus(response.status);
        void emitClientError({
          code: classification.code,
          stage: classification.stage,
          status: response.status,
          attempt,
          retrying
        });

        if (!retrying) return response;
        setRetryMessage();
        await delay(RETRY_DELAY_MS);
      } catch (error) {
        const retrying = attempt < maxAttempts;
        void emitClientError({
          code: classification.code,
          stage: classification.stage,
          status: null,
          attempt,
          retrying
        });

        if (!retrying) throw error;
        setRetryMessage();
        await delay(RETRY_DELAY_MS);
      }
    }

    return nativeFetch(input, init);
  }

  function statusFromMessage(message) {
    const match = String(message || "").match(/status\s+(\d{3})/i);
    return match ? Number(match[1]) : null;
  }

  function classifyCaughtError(message) {
    const value = String(message || "");
    const status = statusFromMessage(value);

    if (/Timed out waiting for Copilot Studio final response/i.test(value)) {
      return { code: "RESPONSE_TIMEOUT", stage: "response_wait", status: null };
    }
    if (/did not return a Direct Line token/i.test(value)) {
      return { code: "TOKEN_GATEWAY_INVALID_PAYLOAD", stage: "token_gateway", status: null };
    }
    if (/did not return a conversation ID/i.test(value)) {
      return { code: "DIRECTLINE_START_INVALID_PAYLOAD", stage: "conversation_start", status: null };
    }
    if (/Copilot token endpoint failed/i.test(value)) {
      return { code: "TOKEN_GATEWAY_FAILED", stage: "token_gateway", status };
    }
    if (/Direct Line conversation start failed/i.test(value)) {
      return { code: "DIRECTLINE_START_FAILED", stage: "conversation_start", status };
    }
    if (/Direct Line token refresh failed/i.test(value)) {
      return { code: "DIRECTLINE_REFRESH_FAILED", stage: "token_refresh", status };
    }
    if (/Direct Line send failed/i.test(value)) {
      return { code: "DIRECTLINE_SEND_FAILED", stage: "activity_send", status };
    }
    if (/Direct Line receive failed/i.test(value)) {
      return { code: "DIRECTLINE_RECEIVE_FAILED", stage: "activity_receive", status };
    }
    if (/Gateway request failed/i.test(value)) {
      return { code: "GATEWAY_REQUEST_FAILED", stage: "gateway", status };
    }

    return null;
  }

  // Keep the existing visitor-facing error handling, but capture the precise failure
  // category when the main SudoChat controller reports a caught request error.
  console.error = (...args) => {
    nativeConsoleError(...args);
    if (args[0] !== "SudoChat request failed") return;

    const error = args[1];
    const mapped = classifyCaughtError(error && error.message ? error.message : error);
    if (!mapped) return;

    void emitClientError({
      ...mapped,
      attempt: 1,
      retrying: false
    });
  };

  window.fetch = reliabilityFetch;

  window.SudoChatReliability = {
    emitClientError
  };

  // Load the background warm-up after the reliability layer has captured the
  // original browser fetch. The helper uses a disposable conversation so its
  // hidden turn cannot influence the visitor's actual chat context.
  if (!document.querySelector('script[data-sudochat-prewarm]')) {
    const script = document.createElement("script");
    script.src = "resources/js/sudochat-prewarm.js";
    script.async = true;
    script.dataset.sudochatPrewarm = "true";
    document.head.appendChild(script);
  }

  // Visitor-facing loading and restricted-network guidance lives separately from
  // transport logic so reliability behaviour remains unchanged.
  if (!document.querySelector('script[data-sudochat-loading-ux]')) {
    const script = document.createElement("script");
    script.src = "resources/js/sudochat-loading-ux.js";
    script.async = true;
    script.dataset.sudochatLoadingUx = "true";
    document.head.appendChild(script);
  }
})();
