(() => {
  const KB_BASE = "https://mustafa-siddiqui.com/sudochat-kb/";
  const WRONG_SOURCE_HOSTS = new Set(["github.com"]);
  const WRONG_SOURCE_PREFIXES = ["/mustafa-sudochat", "/Mustafa-SudoChat"];

  const KB_SOURCES = [
    ["01", "01-who-am-i.html", "Who am I?", ["who is mustafa", "who am i"]],
    ["02", "02-why-i-fit-court-ai-technologist.html", "Why am I suited to the Court AI Technologist role?", ["suited to the court ai technologist role", "fit court ai technologist"]],
    ["03", "03-why-i-want-federal-courts.html", "Why do I want to work for the Federal Courts?", ["why federal courts", "want to work for the federal courts"]],
    ["04", "04-why-federal-courts-should-hire-me.html", "Why should the Federal Courts hire me?", ["why should the federal courts hire", "hire mustafa"]],
    ["05", "05-what-the-courts-mission-means-to-me.html", "What does the Federal Courts mission mean to me?", ["courts mission", "federal courts mission"]],
    ["06", "06-el1-readiness.html", "Am I experienced enough for an EL1 role?", ["el1", "experienced enough"]],
    ["07", "07-my-gaps-for-the-role.html", "What gaps do I have for this role?", ["gaps for the role", "gaps does mustafa have"]],
    ["08", "08-my-copilot-studio-experience.html", "How much Copilot Studio experience do I actually have?", ["copilot studio experience"]],
    ["09", "09-ai-systems-i-have-built.html", "What AI systems have I built?", ["ai systems have i built", "ai systems has mustafa built"]],
    ["10", "10-my-rag-llm-agent-experience.html", "What experience do I have with RAG, LLMs and AI agents?", ["rag llm agent", "rag, llms and ai agents"]],
    ["11", "11-evidence-i-deliver-technical-solutions.html", "What evidence is there that I can actually deliver technical solutions?", ["deliver technical solutions", "evidence i deliver"]],
    ["12", "12-my-government-enterprise-experience.html", "What experience do I have working in government or enterprise environments?", ["government enterprise experience", "government or enterprise environments"]],
    ["13", "13-my-responsible-ai-approach.html", "How do I approach responsible AI?", ["responsible ai"]],
    ["14", "14-how-i-reduce-hallucination.html", "How would I reduce hallucination in an AI system?", ["reduce hallucination", "hallucination"]],
    ["15", "15-what-i-would-refuse-to-automate.html", "What would I refuse to automate in a Court environment?", ["refuse to automate", "court environment"]],
    ["16", "16-how-i-would-design-ai-for-federal-courts.html", "How would I approach designing AI for the Federal Courts?", ["designing ai for the federal courts", "design ai for federal courts"]],
    ["17", "17-how-i-built-sudochat.html", "How did I build SudoChat?", ["how i built sudochat", "how was sudochat built"]],
    ["18", "18-why-i-used-rag-not-fine-tuning.html", "Why did I use RAG rather than fine tuning for SudoChat?", ["rag rather than fine tuning", "rag not fine tuning"]],
    ["19", "19-how-sudochat-handles-insufficient-evidence.html", "How does SudoChat know when it does not have enough evidence to answer?", ["insufficient evidence", "not enough evidence"]],
    ["20", "20-project-best-demonstrating-role-fit.html", "Which of my projects best demonstrates my suitability for this role?", ["project best demonstrating role fit", "best demonstrates suitability"]]
  ].map(([id, file, title, aliases]) => ({
    id,
    file,
    title,
    aliases,
    sourceId: `sudochat_mvp_${id}`,
    url: `${KB_BASE}${file}`
  }));

  function normalise(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/https?:\/\//g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findKbSource(value) {
    const raw = String(value || "");
    const text = normalise(raw);
    if (!text) return null;

    const sourceIdMatch = raw.match(/sudochat[_-]mvp[_-](\d{1,2})/i);
    if (sourceIdMatch) {
      const id = String(Number(sourceIdMatch[1])).padStart(2, "0");
      return KB_SOURCES.find((source) => source.id === id) || null;
    }

    const fileMatch = KB_SOURCES.find((source) => raw.toLowerCase().includes(source.file.toLowerCase()));
    if (fileMatch) return fileMatch;

    const numberedMatch = raw.match(/(?:^|[\/\s_-])(0?[1-9]|1\d|20)(?:[\/\s_-]|$)/);
    if (numberedMatch) {
      const id = String(Number(numberedMatch[1])).padStart(2, "0");
      const numberedSource = KB_SOURCES.find((source) => source.id === id);
      if (numberedSource) return numberedSource;
    }

    return KB_SOURCES.find((source) => {
      const title = normalise(source.title);
      if (title && (text.includes(title) || title.includes(text))) return true;
      return source.aliases.some((alias) => {
        const candidate = normalise(alias);
        return candidate && (text.includes(candidate) || candidate.includes(text));
      });
    }) || null;
  }

  function isWrongPseudoSource(value) {
    try {
      const url = new URL(value);
      if (!WRONG_SOURCE_HOSTS.has(url.hostname)) return false;
      return WRONG_SOURCE_PREFIXES.some((prefix) => url.pathname.toLowerCase().startsWith(prefix.toLowerCase()));
    } catch {
      return false;
    }
  }

  function objectIdentityText(value) {
    if (!value || typeof value !== "object") return "";
    const fields = [
      value.sourceId,
      value.sourceID,
      value.id,
      value.title,
      value.Title,
      value.name,
      value.Name,
      value.fileName,
      value.filename,
      value.url,
      value.URL,
      value.href,
      value.uri,
      value.contentUrl,
      value.contentURL,
      value.contentLocation,
      value.ContentLocation,
      value.sourceUrl,
      value.sourceURL
    ];
    return fields.filter(Boolean).join(" ");
  }

  function canonicaliseCitationObject(value, inheritedSource = null, depth = 0) {
    if (value === null || value === undefined || depth > 10) return;
    if (Array.isArray(value)) {
      value.forEach((item) => canonicaliseCitationObject(item, inheritedSource, depth + 1));
      return;
    }
    if (typeof value !== "object") return;

    const matched = findKbSource(objectIdentityText(value)) || inheritedSource;
    const urlKeys = ["url", "URL", "href", "uri", "contentUrl", "contentURL", "contentLocation", "ContentLocation", "sourceUrl", "sourceURL"];

    if (matched) {
      urlKeys.forEach((key) => {
        if (typeof value[key] === "string" && (isWrongPseudoSource(value[key]) || value[key].includes("mustafa-sudochat"))) {
          value[key] = matched.url;
        }
      });
    }

    Object.values(value).forEach((child) => {
      if (child && typeof child === "object") canonicaliseCitationObject(child, matched, depth + 1);
    });
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0] && args[0].url;

    if (!requestUrl || !requestUrl.includes("directline.botframework.com/v3/directline/") || !requestUrl.includes("/activities")) {
      return response;
    }

    try {
      const clone = response.clone();
      const payload = await clone.json();
      canonicaliseCitationObject(payload);
      return new Response(JSON.stringify(payload), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch {
      return response;
    }
  };

  function canonicaliseRenderedLinks(root = document) {
    root.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.href;
      if (!isWrongPseudoSource(href)) return;

      const identity = [anchor.textContent, anchor.title, anchor.getAttribute("aria-label"), href].filter(Boolean).join(" ");
      const source = findKbSource(identity);

      if (source) {
        anchor.href = source.url;
        anchor.title = `Open SudoChat knowledge source: ${source.title}`;
        anchor.setAttribute("aria-label", anchor.title);
        return;
      }

      anchor.href = KB_BASE;
      anchor.title = "Open the SudoChat Knowledge Base";
      anchor.setAttribute("aria-label", anchor.title);
    });
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) canonicaliseRenderedLinks(node);
      });
    });
  });

  const startObserver = () => {
    const conversation = document.getElementById("conversation");
    if (!conversation) return;
    canonicaliseRenderedLinks(conversation);
    observer.observe(conversation, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  window.SUDOCHAT_KB_SOURCES = KB_SOURCES;
})();
