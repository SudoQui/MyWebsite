# SudoChat Question Logging

This feature logs only the question text submitted through SudoChat. Azure/Application Insights supplies the timestamp. Answers, Direct Line tokens, secrets and conversation IDs are not intentionally logged by this function.

## Function

`src/functions/log-question.js` exposes:

```text
POST /api/log-question
{"question":"What did Mustafa do at Unisys?"}
```

Allowed production origins:

- `https://mustafa-siddiqui.com`
- `https://www.mustafa-siddiqui.com`

The function emits an Application Insights trace beginning with `SudoChatQuestion ` followed by a JSON payload containing the question.

## Query in Application Insights / Logs

```kusto
traces
| where message startswith "SudoChatQuestion "
| extend payload = parse_json(substring(message, strlen("SudoChatQuestion ")))
| project timestamp, question = tostring(payload.question)
| order by timestamp desc
```

## Sampling

If every submitted question must be retained in Application Insights, disable sampling for this low-volume portfolio Function App. In the existing Function App `host.json`, use:

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": false
      }
    }
  }
}
```

If the existing `host.json` contains other settings, merge only the `logging.applicationInsights.samplingSettings` section rather than replacing unrelated configuration.

## Deployment

This file is intended to be added to the existing SudoChat Azure Functions project that already contains the `/api/token` function. Deploy the whole existing Function App project so the token function and logging function are published together.
