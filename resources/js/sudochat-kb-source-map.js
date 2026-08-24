(() => {
  const MANIFEST_PATH = "resources/data/sudochat-kb-manifest.json";
  const KB_BASE = "https://mustafa-siddiqui.com/sudochat-kb/";
  const DIRECT_LINE_FRAGMENT = "directline.botframework.com/v3/directline/";

  let turnMetadataCandidates = [];

  function normalise(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/https?:\/\//g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function prepareSources(payload) {
    if (!payload || !Array.isArray(payload.sources)) return [];

    return payload.sources
      .filter((source) => source && source.sourceId && source.file && source.title)
      .map((source) => ({
        id: String(source.id || "").padStart(2, "0"),
        sourceId: String(source.sourceId),
        file: String(source.file),
        title: String(source.title),
        displayTitle: String(source.displayTitle || source.title),
        aliases: Array.isArray(source.aliases) ? source.aliases.map(String) : [],
        // Internal citation destinations are application-owned. The model never
        // gets to choose or reconstruct a SudoChat KB URL.
        url: `${KB_BASE}${String(source.file)}`
      }));
  }

  const ready = fetch(MANIFEST_PATH, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`KB manifest request failed with status ${response.status}`);
      return response.json();
    })
    .then(prepareSources)
    .catch((error) => {
      console.warn("SudoChat KB manifest unavailable; citations will be withheld", error);
      return [];
    });

  function findSource(value, sources) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    const sourceIdMatch = raw.match(/sudochat[_-]mvp[_-](\d{1,2})/i);
    if (sourceIdMatch) {
      const id = String(Number(sourceIdMatch[1])).padStart(2, "0");
      const bySourceId = sources.find((source) => source.id === id);
      if (bySourceId) return bySourceId;
    }

    const rawLower = raw.toLowerCase();
    const byFile = sources.find((source) => rawLower.includes(source.file.toLowerCase()));
    if (byFile) return byFile;

    const text = normalise(raw);
    if (!text) return null;

    const exact = sources.find((source) => {
      const candidates = [source.sourceId, source.title, source.displayTitle, ...source.aliases]
        .map(normalise)
        .filter(Boolean);
      return candidates.includes(text);
    });
    if (exact) return exact;

    // Citation metadata often wraps a useful source title with unrelated IDs or
    // a generated URL. Contains matching is only allowed for descriptive labels.
    return sources.find((source) => {
      const candidates = [source.title, source.displayTitle, ...source.aliases]
        .map(normalise)
        .filter((candidate) => candidate.length >= 8);
      return candidates.some((candidate) => text.includes(candidate));
    }) || null;
  }

  function extractEvidenceTitles(value) {
    const text = String(value || "");
    const titles = [];
    const seen = new Set();
    const evidenceLine = /^\s*(?:\*\*)?\s*(?:Evidence|Sources?)\s*:?\s*(?:\*\*)?\s*(.*)$/gim;
    let lineMatch;

    const addTitle = (title) => {
      const cleaned = String(title || "")
        .replace(/\\([():/])/g, "$1")
        .replace(/^[-–—|·\s]+|[-–—|·\s]+$/g, "")
        .trim();
      const key = normalise(cleaned);
      if (!key || seen.has(key)) return;
      seen.add(key);
      titles.push(cleaned);
    };

    while ((lineMatch = evidenceLine.exec(text)) !== null) {
      const segment = lineMatch[1] || "";
      const linkPattern = /\[([^\]]+)\]\s*\\?\([^)]*\)/g;
      let linkMatch;
      let foundLink = false;

      while ((linkMatch = linkPattern.exec(segment)) !== null) {
        foundLink = true;
        addTitle(linkMatch[1]);
      }

      if (!foundLink && segment.trim()) {
        segment
          .split(/\s*(?:\||·|;)\s*/)
          .map((part) => part.replace(/https?\\?:\\?\/\\?\/\S+/gi, "").replace(/[\[\]()]/g, "").trim())
          .filter(Boolean)
          .forEach(addTitle);
      }
    }

    return titles;
  }

  function stripEvidenceSections(value) {
    const lines = String(value || "").split(/\r?\n/);
    const output = [];
    let skippingLinkOnlyLines = false;

    for (const line of lines) {
      const evidenceHeading = /^\s*(?:\*\*)?\s*(?:Evidence|Sources?)\s*:?\s*(?:\*\*)?\s*(.*)$/i.exec(line);
      if (evidenceHeading) {
        skippingLinkOnlyLines = !String(evidenceHeading[1] || "").trim();
        continue;
      }

      if (skippingLinkOnlyLines) {
        if (!line.trim()) {
          skippingLinkOnlyLines = false;
          continue;
        }

        const linkOnly = /^\s*(?:[-*]\s*)?(?:\[[^\]]+\]\s*\\?\([^)]*\)|https?\\?:\\?\/\\?\/\S+|\|)+\s*$/i.test(line);
        if (linkOnly) continue;
        skippingLinkOnlyLines = false;
      }

      output.push(line);
    }

    return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function metadataIdentity(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";

    const keys = [
      "sourceId", "sourceID", "source_id", "id",
      "title", "Title", "name", "Name",
      "file", "fileName", "filename",
      "url", "URL", "href", "uri",
      "contentUrl", "contentURL", "contentLocation", "ContentLocation",
      "sourceUrl", "sourceURL"
    ];

    return keys
      .map((key) => value[key])
      .filter((item) => typeof item === "string" || typeof item === "number")
      .join(" ");
  }

  function addCandidate(value) {
    const candidate = String(value || "").trim();
    if (!candidate) return;
    if (!turnMetadataCandidates.includes(candidate)) turnMetadataCandidates.push(candidate);
  }

  function collectMetadataCandidates(value, depth = 0, parentKey = "") {
    if (value === null || value === undefined || depth > 9) return;

    if (Array.isArray(value)) {
      value.forEach((item) => collectMetadataCandidates(item, depth + 1, parentKey));
      return;
    }

    if (typeof value === "string" || typeof value === "number") {
      if (/source|citation|title|name|file|url|uri|href|location|id/i.test(parentKey)) addCandidate(value);
      return;
    }

    if (typeof value !== "object") return;

    addCandidate(metadataIdentity(value));

    Object.entries(value).forEach(([key, child]) => {
      if (key === "text" || key === "speak") return;
      collectMetadataCandidates(child, depth + 1, key);
    });
  }

  function captureActivities(payload) {
    const activities = payload && Array.isArray(payload.activities) ? payload.activities : [];
    activities.forEach((activity) => {
      const text = String((activity && (activity.text || activity.speak)) || "");
      extractEvidenceTitles(text).forEach(addCandidate);
      collectMetadataCandidates(activity && activity.citationEntities, 0, "citationEntities");
      collectMetadataCandidates(activity && activity.entities, 0, "entities");
      collectMetadataCandidates(activity && activity.attachments, 0, "attachments");
      collectMetadataCandidates(activity && activity.channelData, 0, "channelData");
      collectMetadataCandidates(activity && activity.value, 0, "value");
    });
  }

  function requestMethod(args) {
    const initMethod = args[1] && args[1].method;
    if (initMethod) return String(initMethod).toUpperCase();
    const input = args[0];
    return input && input.method ? String(input.method).toUpperCase() : "GET";
  }

  function requestBody(args) {
    if (args[1] && typeof args[1].body === "string") return args[1].body;
    return "";
  }

  // Passively inspect Direct Line metadata. Responses are returned unchanged;
  // the model's URLs never become trusted application state.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0] && args[0].url;
    const isActivityRequest = Boolean(requestUrl && requestUrl.includes(DIRECT_LINE_FRAGMENT) && requestUrl.includes("/activities"));

    if (isActivityRequest && requestMethod(args) === "POST") {
      try {
        const body = JSON.parse(requestBody(args) || "{}");
        if (body && body.type === "message") turnMetadataCandidates = [];
      } catch {
        turnMetadataCandidates = [];
      }
    }

    const response = await nativeFetch(...args);

    if (isActivityRequest && requestMethod(args) === "GET") {
      response.clone().json().then(captureActivities).catch(() => {});
    }

    return response;
  };

  function addResolvedSource(target, source) {
    if (!source || target.some((item) => item.sourceId === source.sourceId)) return;
    target.push({
      id: source.id,
      sourceId: source.sourceId,
      file: source.file,
      label: source.displayTitle || source.title,
      title: source.title,
      url: source.url
    });
  }

  function resolveRenderedSources(rawText, node, sources, metadataSnapshot) {
    const resolved = [];

    // Named Evidence/Sources entries preserve the model's intended source order,
    // but their generated URLs are discarded completely.
    extractEvidenceTitles(rawText).forEach((title) => {
      addResolvedSource(resolved, findSource(title, sources));
    });

    // Existing rendered links can still contain useful labels even when their URL
    // is malformed. Use the label as identity, never the destination.
    node.querySelectorAll(".source-block a").forEach((anchor) => {
      [anchor.textContent, anchor.title, anchor.getAttribute("aria-label")]
        .filter(Boolean)
        .forEach((value) => addResolvedSource(resolved, findSource(value, sources)));
    });

    metadataSnapshot.forEach((candidate) => {
      addResolvedSource(resolved, findSource(candidate, sources));
    });

    return resolved.slice(0, 12);
  }

  function appendTextWithCitations(paragraph, text, resolved) {
    paragraph.replaceChildren();
    const markerPattern = /\[(\d+)\]/g;
    let cursor = 0;
    let match;

    const appendPlainText = (value) => {
      const parts = String(value).split("\n");
      parts.forEach((part, index) => {
        if (index) paragraph.appendChild(document.createElement("br"));
        if (part) paragraph.appendChild(document.createTextNode(part));
      });
    };

    while ((match = markerPattern.exec(text)) !== null) {
      appendPlainText(text.slice(cursor, match.index));
      const source = resolved[Number(match[1]) - 1];

      if (source) {
        const anchor = document.createElement("a");
        anchor.href = source.url;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.textContent = match[0];
        anchor.title = `Open source ${match[1]}: ${source.label}`;
        anchor.setAttribute("aria-label", anchor.title);
        paragraph.appendChild(anchor);
      } else {
        paragraph.appendChild(document.createTextNode(match[0]));
      }

      cursor = markerPattern.lastIndex;
    }

    appendPlainText(text.slice(cursor));
  }

  function renderSourceBlock(node, resolved) {
    const oldBlock = node.querySelector(".source-block");
    if (oldBlock) oldBlock.remove();
    if (!resolved.length) return;

    const block = document.createElement("div");
    block.className = "source-block";

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "Sources";
    block.appendChild(label);

    const list = document.createElement("div");
    list.className = "source-list";

    resolved.forEach((source, index) => {
      const anchor = document.createElement("a");
      anchor.href = source.url;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.textContent = `[${index + 1}] ${source.label} ↗`;
      anchor.title = source.url;
      list.appendChild(anchor);
    });

    block.appendChild(list);
    node.appendChild(block);
  }

  async function enhanceRenderedMessage(node) {
    if (!node || !node.matches || !node.matches(".message.assistant")) return;
    if (node.classList.contains("thinking-message")) return;

    const paragraph = node.querySelector("p");
    if (!paragraph) return;

    const rawText = paragraph.innerText || paragraph.textContent || "";
    const metadataSnapshot = [...turnMetadataCandidates];
    const sources = await ready;
    const resolved = resolveRenderedSources(rawText, node, sources, metadataSnapshot);
    const cleanedText = stripEvidenceSections(rawText);

    appendTextWithCitations(paragraph, cleanedText, resolved);
    renderSourceBlock(node, resolved);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.matches && node.matches(".message.assistant")) enhanceRenderedMessage(node);
        node.querySelectorAll && node.querySelectorAll(".message.assistant").forEach(enhanceRenderedMessage);
      });
    });
  });

  const startObserver = () => {
    const conversation = document.getElementById("conversation");
    if (!conversation) return;
    conversation.querySelectorAll(".message.assistant").forEach(enhanceRenderedMessage);
    observer.observe(conversation, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  async function resolve(value) {
    const sources = await ready;
    const source = findSource(value, sources);
    if (!source) return null;
    return {
      id: source.id,
      sourceId: source.sourceId,
      file: source.file,
      label: source.displayTitle || source.title,
      title: source.title,
      url: source.url
    };
  }

  window.SudoChatKbSources = {
    ready,
    resolve,
    extractEvidenceTitles,
    stripEvidenceSections,
    baseUrl: KB_BASE
  };
})();
