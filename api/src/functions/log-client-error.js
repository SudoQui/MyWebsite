const { app } = require("@azure/functions");

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

function normaliseString(value, maxLength = 64) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

app.http("logClientError", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "log-client-error",
  handler: async (request, context) => {
    const origin = request.headers.get("origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      if (!allowedOrigins.has(origin)) return { status: 403, headers };
      return { status: 204, headers };
    }

    // This endpoint is only for telemetry emitted by the public SudoChat UI.
    // Requiring the browser Origin reduces casual external log spam.
    if (!allowedOrigins.has(origin)) {
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

    const code = normaliseString(body?.code);
    const stage = normaliseString(body?.stage);
    const status = Number.isInteger(body?.status) && body.status >= 100 && body.status <= 599
      ? body.status
      : null;
    const attempt = Number.isInteger(body?.attempt) && body.attempt >= 1 && body.attempt <= 2
      ? body.attempt
      : 1;
    const retrying = body?.retrying === true;
    const online = typeof body?.online === "boolean" ? body.online : null;

    if (!code || !stage) {
      return {
        status: 400,
        headers,
        jsonBody: { error: "code and stage are required" }
      };
    }

    // Deliberately excludes question text, answers, tokens, secrets, conversation IDs,
    // request URLs and browser identifiers. Application Insights supplies timestamp.
    context.log(`SudoChatClientError ${JSON.stringify({
      code,
      stage,
      status,
      attempt,
      retrying,
      online
    })}`);

    return { status: 204, headers };
  }
});
