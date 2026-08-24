(() => {
  const MANIFEST_PATH = "resources/data/sudochat-kb-manifest.json";
  const KB_BASE = "https://mustafa-siddiqui.com/sudochat-kb/";

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
        // The destination is always constructed by application code. Model-provided
        // URLs are never trusted for SudoChat knowledge-base citations.
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

    // Metadata often contains a title plus a generated URL or other wrapper text.
    // Only use sufficiently descriptive complete aliases/titles for contains matching.
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

  function collectMetadataSources(value, sources, target, depth = 0, parentKey = "") {
    if (value === null || value === undefined || depth > 9) return;

    if (Array.isArray(value)) {
      value.forEach((item) => collectMetadataSources(item, sources, target, depth + 1, parentKey));
      return;
    }

    if (typeof value === "string") {
      if (/source|citation|title|name|file|url|uri|href|location|id/i.test(parentKey)) {
        addResolvedSource(target, findSource(value, sources));
      }
      return;
    }

    if (typeof value !== "object") return;

    addResolvedSource(target, findSource(metadataIdentity(value), sources));

    Object.entries(value).forEach(([key, child]) => {
      // The natural-language answer is handled separately. Do not infer a source
      // merely because ordinary answer text happens to resemble a KB title.
      if (key === "text" || key === "speak") return;
      collectMetadataSources(child, sources, target, depth + 1, key);
    });
  }

  async function resolveTurn(activities, answerText) {
    const sources = await ready;
    if (!sources.length) return [];

    const resolved = [];

    // If Copilot prints a named Evidence/Sources line, use the titles as ordered
    // source identities, but never use the URLs printed by the language model.
    extractEvidenceTitles(answerText).forEach((title) => {
      addResolvedSource(resolved, findSource(title, sources));
    });

    (Array.isArray(activities) ? activities : []).forEach((activity) => {
      collectMetadataSources(activity && activity.citationEntities, sources, resolved, 0, "citationEntities");
      collectMetadataSources(activity && activity.entities, sources, resolved, 0, "entities");
      collectMetadataSources(activity && activity.attachments, sources, resolved, 0, "attachments");
      collectMetadataSources(activity && activity.channelData, sources, resolved, 0, "channelData");
      collectMetadataSources(activity && activity.value, sources, resolved, 0, "value");
    });

    return resolved;
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
    resolveTurn,
    extractEvidenceTitles,
    stripEvidenceSections,
    baseUrl: KB_BASE
  };
})();
