const { app } = require("@azure/functions");

const allowedOrigins = new Set([
  "https://mustafa-siddiqui.com",
  "https://www.mustafa-siddiqui.com"
]);

function corsHeaders(request) {
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
  }
  return {};
}

app.http("token", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "token",
  handler: async (request, context) => {
    const headers = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return { status: 204, headers };
    }

    const origin = request.headers.get("origin");
    if (origin && !allowedOrigins.has(origin)) {
      return {
        status: 403,
        headers,
        jsonBody: { error: "Origin not allowed." }
      };
    }

    const secret = process.env.COPILOT_DIRECTLINE_SECRET;
    if (!secret) {
      context.error("COPILOT_DIRECTLINE_SECRET is not configured.");
      return {
        status: 500,
        headers,
        jsonBody: { error: "Chat gateway is not configured." }
      };
    }

    try {
      const response = await fetch(
        "https://directline.botframework.com/v3/directline/tokens/generate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        context.error(`Direct Line token request failed (${response.status}): ${detail}`);
        return {
          status: 502,
          headers,
          jsonBody: { error: "Unable to create chat token." }
        };
      }

      const data = await response.json();
      return {
        status: 200,
        headers: {
          ...headers,
          "Cache-Control": "no-store"
        },
        jsonBody: {
          token: data.token,
          expires_in: data.expires_in,
          conversationId: data.conversationId
        }
      };
    } catch (error) {
      context.error(error);
      return {
        status: 502,
        headers,
        jsonBody: { error: "Unable to reach Direct Line." }
      };
    }
  }
});
