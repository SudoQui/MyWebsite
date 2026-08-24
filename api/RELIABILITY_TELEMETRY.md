# SudoChat Reliability Telemetry

SudoChat now records client-side failure categories separately from submitted questions so intermittent browser → Direct Line → Copilot Studio failures can be diagnosed without logging tokens, secrets, conversation IDs, answers, request URLs or browser identifiers.

## Automatic retry policy

The browser retries one time after a 900 ms delay for transient failures on operations that are safe to repeat:

- `/api/token` GET
- Direct Line conversation start
- Direct Line token refresh
- Direct Line activity receive GET

Transient statuses are HTTP 408, 425, 429 and 5xx, plus network-level fetch failures.

The Direct Line message-send POST is deliberately **not** retried automatically. If the HTTP response is lost, the browser cannot prove that the activity was not already accepted, so retrying could submit the visitor's question twice.

## Logged event

`POST /api/log-client-error` writes a trace beginning with `SudoChatClientError `.

Only these fields are accepted:

- `code`
- `stage`
- `status`
- `attempt`
- `retrying`
- `online`

Application Insights supplies the timestamp.

## Query recent failures

```kusto
traces
| where message startswith "SudoChatClientError "
| extend payload = parse_json(substring(message, strlen("SudoChatClientError ")))
| project
    timestamp,
    code = tostring(payload.code),
    stage = tostring(payload.stage),
    status = toint(payload.status),
    attempt = toint(payload.attempt),
    retrying = tobool(payload.retrying),
    online = tobool(payload.online)
| order by timestamp desc
```

## Failure counts

```kusto
traces
| where timestamp > ago(7d)
| where message startswith "SudoChatClientError "
| extend payload = parse_json(substring(message, strlen("SudoChatClientError ")))
| summarize count() by code = tostring(payload.code), stage = tostring(payload.stage)
| order by count_ desc
```

## Useful codes

- `TOKEN_GATEWAY_FAILED`
- `TOKEN_GATEWAY_INVALID_PAYLOAD`
- `DIRECTLINE_START_FAILED`
- `DIRECTLINE_START_INVALID_PAYLOAD`
- `DIRECTLINE_REFRESH_FAILED`
- `DIRECTLINE_SEND_FAILED`
- `DIRECTLINE_RECEIVE_FAILED`
- `RESPONSE_TIMEOUT`
- `GATEWAY_REQUEST_FAILED`

A trace with `retrying=true` means the first transient operation failed and the browser automatically tried it once more. If there is no subsequent visitor-facing failure, the retry recovered the turn.

## Deployment

This feature adds the `logClientError` Azure Function to the existing SudoChat Function App project. Publish from the `api` project root:

```powershell
func azure functionapp publish sudochat-gateway-ms --javascript --build remote
```

After deployment, confirm both `logQuestion` and `logClientError` are present in the Function App.
