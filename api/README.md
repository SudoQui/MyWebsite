# SudoChat Azure Function gateway

This folder contains the HTTP-triggered Azure Function that exchanges the private Copilot Studio Direct Line secret for a short-lived Direct Line token.

## Azure setting

Configure this Function App setting in Azure. Do not commit its value:

- `COPILOT_DIRECTLINE_SECRET`

## Deploy

From this `api` directory with Azure Functions Core Tools installed:

```bash
npm install
func azure functionapp publish sudochat-gateway-ms
```

The HTTP endpoint is expected at:

`https://sudochat-gateway-ms-geh3fkcyepctf3h2.australiaeast-01.azurewebsites.net/api/token`

The public website is permitted by the function for:

- `https://mustafa-siddiqui.com`
- `https://www.mustafa-siddiqui.com`

The browser receives only a short-lived token. The Direct Line secret remains in Azure Function App settings.
