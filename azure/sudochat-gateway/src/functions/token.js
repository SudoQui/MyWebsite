const { app } = require("@azure/functions");

const DIRECT_LINE_TOKEN_URL = "https://directline.botframework.com/v3/directline/tokens/generate";
const ALLOWED_ORIGINS = new Set([
  "https://mustafa-siddiqui.com",
  "https://www.mustafa-siddiqui.com"
]);

app.http("token", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "token",
  handler: async (request, context) => {
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return { status: 403 };
      }

      return {
        status: 204,
        headers: corsHeaders(origin)
      };
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return {
        status: 403,
        jsonBody: { error: "Origin not allowed." }
      };
    }

    const secret = process.env.COPILOT_DIRECTLINE_SECRET;
    if (!secret) {
      context.error("COPILOT_DIRECTLINE_SECRET is not configured.");
      return {
        status: 500,
        headers: responseHeaders(origin),
        jsonBody: { error: "Chat gateway is not configured." }
      };
    }

    try {
      const response = await fetch(DIRECT_LINE_TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const detail = await response.text();
        context.error(`Direct Line token generation failed (${response.status}): ${detail}`);
        return {
          status: 502,
          headers: responseHeaders(origin),
          jsonBody: { error: "Unable to start a SudoChat session." }
        };
      }

      const data = await response.json();

      return {
        status: 200,
        headers: responseHeaders(origin),
        jsonBody: {
          token: data.token,
          expires_in: data.expires_in,
          conversationId: data.conversationId
        }
      };
    } catch (error) {
      context.error("Direct Line token generation threw an exception.", error);
      return {
        status: 502,
        headers: responseHeaders(origin),
        jsonBody: { error: "Unable to start a SudoChat session." }
      };
    }
  }
});

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function responseHeaders(origin) {
  return {
    "Cache-Control": "no-store",
    ...(origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {})
  };
}
