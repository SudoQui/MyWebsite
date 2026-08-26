(() => {
  const FIRST_TURN_WARNING_MS = 20000;
  const LONG_FIRST_TURN_MESSAGE = "First responses can take up to about 70 seconds while the secure AI session starts. SudoChat is still working.";
  const NETWORK_FAILURE_MESSAGE = "SudoChat could not reach the AI service. Some government or corporate networks may block external AI traffic. If your organisation permits it, try again on a personal connection or mobile hotspot. The portfolio and Engine Room remain available.";

  const loadingCopy = new Map([
    ["Connecting to the grounded agent", "Starting SudoChat securely"],
    ["Retrieving grounded evidence", "Checking Mustafa's approved evidence"],
    ["Formulating grounded response", "Preparing a grounded answer"],
    ["Finalising grounded response", "Checking the answer and sources"],
    ["Working through the grounded response", "Reviewing the approved evidence"]
  ]);

  let firstTurnWarningTimer = null;
  let firstTurnWaiting = false;

  function userMessageCount(conversation) {
    return conversation ? conversation.querySelectorAll(".message.user").length : 0;
  }

  function clearFirstTurnWarning() {
    if (firstTurnWarningTimer) window.clearTimeout(firstTurnWarningTimer);
    firstTurnWarningTimer = null;
    firstTurnWaiting = false;
  }

  function applyLoadingCopy(node) {
    if (!node) return;
    const current = String(node.textContent || "").trim();

    if (firstTurnWaiting) {
      if (current !== LONG_FIRST_TURN_MESSAGE) node.textContent = LONG_FIRST_TURN_MESSAGE;
      return;
    }

    const replacement = loadingCopy.get(current);
    if (replacement && replacement !== current) node.textContent = replacement;
  }

  function startFirstTurnWarning(conversation, thinkingNode) {
    clearFirstTurnWarning();
    if (userMessageCount(conversation) !== 1) return;

    firstTurnWarningTimer = window.setTimeout(() => {
      if (!thinkingNode.isConnected) return;
      firstTurnWaiting = true;
      const text = thinkingNode.querySelector("[data-thinking-text]");
      if (text) text.textContent = LONG_FIRST_TURN_MESSAGE;
    }, FIRST_TURN_WARNING_MS);
  }

  function improveFailureMessage(message) {
    if (!message || !message.matches(".message.assistant")) return;
    const label = message.querySelector(".message-label");
    if (!label || !/service unavailable/i.test(label.textContent || "")) return;

    label.textContent = "AI SERVICE UNREACHABLE";
    const body = message.querySelector("p");
    if (body) body.textContent = NETWORK_FAILURE_MESSAGE;
  }

  function setup() {
    const conversation = document.getElementById("conversation");
    if (!conversation || typeof MutationObserver !== "function") return;

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          const textNode = record.target.parentElement && record.target.parentElement.closest("[data-thinking-text]");
          if (textNode) applyLoadingCopy(textNode);
          continue;
        }

        if (record.type === "childList" && record.target instanceof Element) {
          const updatedThinkingText = record.target.matches("[data-thinking-text]")
            ? record.target
            : record.target.closest("[data-thinking-text]");
          if (updatedThinkingText) applyLoadingCopy(updatedThinkingText);
        }

        for (const added of record.addedNodes) {
          if (!(added instanceof Element)) continue;

          const thinkingNode = added.matches(".thinking-message")
            ? added
            : added.querySelector(".thinking-message");

          if (thinkingNode) {
            const text = thinkingNode.querySelector("[data-thinking-text]");
            applyLoadingCopy(text);
            startFirstTurnWarning(conversation, thinkingNode);
          }

          const assistantMessage = added.matches(".message.assistant")
            ? added
            : added.querySelector(".message.assistant");

          if (assistantMessage && !assistantMessage.classList.contains("thinking-message")) {
            clearFirstTurnWarning();
            improveFailureMessage(assistantMessage);
          }
        }

        if (record.type === "childList") {
          const activeThinking = conversation.querySelector(".thinking-message");
          if (!activeThinking) clearFirstTurnWarning();
        }
      }
    });

    observer.observe(conversation, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
