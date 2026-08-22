const { app } = require("@azure/functions");

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async () => ({
    status: 200,
    headers: { "Cache-Control": "no-store" },
    jsonBody: { status: "ok", service: "sudochat-gateway" }
  })
});
