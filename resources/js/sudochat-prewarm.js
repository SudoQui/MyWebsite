(() => {
  const CONFIG_PATH = "resources/js/sudochat-config.json";
  const DIRECT_LINE_BASE = "https://directline.botframework.com/v3/directline";
  const WARMUP_PROMPT = "Provide a one-sentence grounded overview of Mustafa Siddiqui using approved knowledge only.";
  const WARMUP_COOLDOWN_MS = 30 * 60 * 1000;
  const WARMUP_TIMEOUT_MS = 30000;
  const POLL_INTERVAL_MS = 900;
  const STORAGE_KEY = "sudochat.prewarm.lastAttempt.v1";

  // Capture the browser's original fetch before the reliability wrapper is loaded.
  // Warm-up is best-effort and must not create visitor-facing error telemetry.
  const nativeFetch = window.fetch.bind(window);
  let userInteracted = false;

  function markUserInteraction() {
    userInteracted = true;
  }

  function shouldSkipWarmup() {
    try {
      if (navigator.connection && navigator.connection.saveData) return true;
      const lastAttempt = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
      return Number.isFinite(lastAttempt) && Date.now() - lastAttempt < WARMUP_COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  function recordAttempt() {
    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Storage is optional; warm-up still works if unavailable.
    }
  }

  function createWarmupUserId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `sudochat-prewarm-${window.crypto.randomUUID()}`;
    }
    return `sudochat-prewarm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function getTokenEndpoint() {
    const inline = window.SUDOCHAT_CONFIG || {};
    if (inline.tokenEndpoint) return String(inline.tokenEndpoint);

    const response = await nativeFetch(CONFIG_PATH, {
      cache: "no-store",
      credentials: "omit"
    });
    if (!response.ok) return "";

    const config = await response.json();
    return String(config.tokenEndpoint || "");
  }

  async function waitForWarmupResponse(conversationId, token, userId) {
    const deadline = Date.now() + WARMUP_TIMEOUT_MS;
    let watermark = "";

    while (Date.now() < deadline) {
      const suffix = watermark ? `?watermark=${encodeURIComponent(watermark)}` : "";
      const response = await nativeFetch(
        `${DIRECT_LINE_BASE}/conversations/${encodeURIComponent(conversationId)}/activities${suffix}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        }
      );

      if (!response.ok) return;
      const payload = await response.json();
      if (payload.watermark !== undefined && payload.watermark !== null) {
        watermark = String(payload.watermark);
      }

      const activities = Array.isArray(payload.activities) ? payload.activities : [];
      const botAnswered = activities.some((activity) => {
        if (!activity || activity.type !== "message") return false;
        if (activity.from && activity.from.id === userId) return false;
        return Boolean(String(activity.text || activity.speak || "").trim());
      });

      if (botAnswered) return;
      await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  async function runWarmup() {
    if (userInteracted || shouldSkipWarmup()) return;
    recordAttempt();

    try {
      const tokenEndpoint = await getTokenEndpoint();
      if (!tokenEndpoint || userInteracted) return;

      const tokenResponse = await nativeFetch(tokenEndpoint, {
        method: "GET",
        cache: "no-store",
        credentials: "omit"
      });
      if (!tokenResponse.ok) return;

      const tokenPayload = await tokenResponse.json();
      const token = String(tokenPayload.token || "");
      if (!token) return;

      const conversationResponse = await nativeFetch(`${DIRECT_LINE_BASE}/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      if (!conversationResponse.ok) return;

      const conversationPayload = await conversationResponse.json();
      const conversationId = String(
        conversationPayload.conversationId || tokenPayload.conversationId || ""
      );
      if (!conversationId || userInteracted) return;

      const userId = createWarmupUserId();
      const sendResponse = await nativeFetch(
        `${DIRECT_LINE_BASE}/conversations/${encodeURIComponent(conversationId)}/activities`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "message",
            from: { id: userId, name: "SudoChat warm-up" },
            text: WARMUP_PROMPT,
            textFormat: "plain",
            locale: "en-AU"
          })
        }
      );
      if (!sendResponse.ok) return;

      // This is a disposable conversation. Waiting until the first grounded answer
      // completes warms the same Copilot/RAG/model path used by the visitor, but the
      // hidden turn never enters the visitor's real conversation or UI.
      await waitForWarmupResponse(conversationId, token, userId);
    } catch (error) {
      console.debug("SudoChat background warm-up skipped", error);
    }
  }

  document.addEventListener("submit", markUserInteraction, { capture: true, once: true });
  document.addEventListener("pointerdown", (event) => {
    if (event.target && event.target.closest && event.target.closest("[data-prompt], #chat-form")) {
      markUserInteraction();
    }
  }, { capture: true, once: true });

  const scheduleWarmup = () => {
    if (shouldSkipWarmup()) return;
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => void runWarmup(), { timeout: 800 });
    } else {
      window.setTimeout(() => void runWarmup(), 350);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleWarmup, { once: true });
  } else {
    scheduleWarmup();
  }
})();
