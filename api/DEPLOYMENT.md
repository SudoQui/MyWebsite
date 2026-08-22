# Deployment checklist

1. Confirm Azure Function App `sudochat-gateway-ms` is running.
2. Confirm the Azure Function App setting `COPILOT_DIRECTLINE_SECRET` contains Copilot Studio Secret 1.
3. From this `api` directory run `npm install`.
4. Sign in to Azure CLI / Functions Core Tools if required.
5. Run `func azure functionapp publish sudochat-gateway-ms`.
6. Verify `/api/health` returns `{ "status": "ok", "service": "sudochat-gateway" }`.
7. Verify `/api/token` returns a short-lived token object and never exposes the Direct Line secret.
8. Test the live SudoChat website.
