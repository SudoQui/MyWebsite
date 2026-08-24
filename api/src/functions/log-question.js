const { app } = require("@azure/functions");

const MAX_QUESTION_LENGTH = 1500;
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

    const question = typeof body?.question === "string" ? body.question.trim() : "";

    if (!question) {
      return {
        status: 400,
        headers,
        jsonBody: { error: "Question is required" }
      };
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return {
        status: 400,
        headers,
        jsonBody: { error: "Question exceeds 1500 characters" }
      };
    }

    // Intentionally logs only the submitted question. Azure/Application Insights
    // supplies the timestamp. Do not add tokens, secrets, conversation IDs or answers.
    context.log(`SudoChatQuestion ${JSON.stringify({ question })}`);

    return { status: 204, headers };
  }
});
