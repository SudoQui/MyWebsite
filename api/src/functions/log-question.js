const { app } = require("@azure/functions");
const crypto = require("crypto");

const MAX_QUESTION_LENGTH = 1500;
const MAX_ANSWER_LENGTH = 8000;
const MAX_ID_LENGTH = 96;
const MAX_SOURCE_LENGTH = 64;
const allowedOrigins = new Set([
  "https://mustafa-siddiqui.com",
  "https://www.mustafa-siddiqui.com"
]);

function corsHeaders(origin) {
  const headers = {
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function normaliseString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const candidate = forwarded.split(",")[0].trim()
    || request.headers.get("x-azure-clientip")
    || request.headers.get("x-client-ip")
    || "";

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  return ipv4WithPort ? ipv4WithPort[1] : candidate;
}

function hashClientIp(request) {
  const salt = process.env.SUDOCHAT_VISITOR_HASH_SALT || "";
  const ip = getClientIp(request);
  if (!salt || !ip) return "";

  return crypto
    .createHmac("sha256", salt)
    .update(ip)
    .digest("hex")
    .slice(0, 16);
}

function australiaTime() {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short"
    }).format(new Date());
  } catch {
    return "";
  }
}

app.http("logQuestion", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "log-question",
  handler: async (request, context) => {
    const origin = request.headers.get("origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      if (origin && !allowedOrigins.has(origin)) {
        return { status: 403, headers };
      }
      return { status: 204, headers };
    }

    if (origin && !allowedOrigins.has(origin)) {
      return {
        status: 403,
        headers,
        jsonBody: { error: "Origin not allowed" }
      };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        headers,
        jsonBody: { error: "Invalid JSON body" }
      };
    }

    const eventType = normaliseString(body?.eventType, 16) || "question";
    const visitorId = normaliseString(body?.visitorId, MAX_ID_LENGTH);
    const sessionId = normaliseString(body?.sessionId, MAX_ID_LENGTH);
    const turnId = normaliseString(body?.turnId, MAX_ID_LENGTH);
    const source = normaliseString(body?.source, MAX_SOURCE_LENGTH) || "untagged";
    const question = normaliseString(body?.question, MAX_QUESTION_LENGTH);
    const answer = normaliseString(body?.answer, MAX_ANSWER_LENGTH);
    const responseLabel = normaliseString(body?.responseLabel, 96);
    const outcome = normaliseString(body?.outcome, 24);
    const durationMs = Number.isFinite(body?.durationMs)
      ? Math.max(0, Math.min(Math.round(body.durationMs), 300000))
      : null;

    if (!question) {
      return {
        status: 400,
        headers,
        jsonBody: { error: "Question is required" }
      };
    }

    if (!visitorId || !sessionId || !turnId) {
      return {
        status: 400,
        headers,
        jsonBody: { error: "visitorId, sessionId and turnId are required" }
      };
    }

    if (!new Set(["question", "answer", "error"]).has(eventType)) {
      return {
        status: 400,
        headers,
        jsonBody: { error: "Unsupported eventType" }
      };
    }

    if (eventType === "answer" && !answer) {
      return {
        status: 400,
        headers,
        jsonBody: { error: "Answer is required for answer events" }
      };
    }

    const payload = {
      australiaTime: australiaTime(),
      source,
      visitorId,
      sessionId,
      turnId,
      ipHash: hashClientIp(request),
      question,
      answer: eventType === "question" ? "" : answer,
      responseLabel,
      outcome: outcome || (eventType === "answer" ? "answered" : eventType),
      durationMs
    };

    const prefix = eventType === "question"
      ? "SudoChatQuestion"
      : eventType === "answer"
        ? "SudoChatAnswer"
        : "SudoChatTurnError";

    // Raw IP addresses are never written to logs. If SUDOCHAT_VISITOR_HASH_SALT is
    // configured, only a one-way keyed hash is retained for coarse repeat-visitor
    // correlation. Application Insights still supplies its normal UTC timestamp.
    context.log(`${prefix} ${JSON.stringify(payload)}`);

    return { status: 204, headers };
  }
});
