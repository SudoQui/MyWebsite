(() => {
  const shell = document.getElementById("sudochat-shell");
  const chatView = document.getElementById("chat-view");
  const engineView = document.getElementById("engine-view");
  if (!shell || !chatView || !engineView) return;

  function applyView(mode) {
    const showEngine = mode === "engine";
    shell.dataset.view = showEngine ? "engine" : "chat";
    chatView.style.pointerEvents = showEngine ? "none" : "auto";
    engineView.style.pointerEvents = showEngine ? "auto" : "none";
    chatView.setAttribute("aria-hidden", String(showEngine));
    engineView.setAttribute("aria-hidden", String(!showEngine));
  }

  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-mode]");
    if (!control) return;
    event.preventDefault();
    applyView(control.dataset.mode || "chat");
  });

  applyView(shell.dataset.view || "chat");
})();
