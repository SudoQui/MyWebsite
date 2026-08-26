# SudoChat Session Analytics

SudoChat records question and answer events in Application Insights with pseudonymous visitor/session identifiers. Raw IP addresses are not logged.

## Fields

Each event can include:

- `australiaTime` — Australia/Sydney local time (AEST or AEDT as applicable)
- `source` — optional link tag such as `recruiter` or `tester-mustafa`
- `visitorId` — browser-local pseudonymous ID persisted in localStorage
- `sessionId` — tab/session ID persisted in sessionStorage
- `turnId` — unique ID for one question/answer turn
- `ipHash` — optional one-way HMAC of the network address; only populated when `SUDOCHAT_VISITOR_HASH_SALT` is configured
- `question`
- `answer`
- `responseLabel`
- `outcome`
- `durationMs`

The `source` tag is more reliable than IP for distinguishing testers from a recruiter. Share tagged links such as:

- `https://mustafa-siddiqui.com/sudochat.html?source=recruiter`
- `https://mustafa-siddiqui.com/sudochat.html?source=tester-mustafa`
- `https://mustafa-siddiqui.com/sudochat.html?source=tester-friend1`

An untagged visitor remains `source=untagged`; do not assume an untagged visitor is the recruiter.

## Conversation rows, sorted by session

```kusto
traces
| where message startswith "SudoChatAnswer " or message startswith "SudoChatTurnError "
| extend payload = parse_json(substring(message, indexof(message, " ") + 1))
| project
    timestamp,
    australiaTime = tostring(payload.australiaTime),
    source = tostring(payload.source),
    visitorId = tostring(payload.visitorId),
    ipHash = tostring(payload.ipHash),
    sessionId = tostring(payload.sessionId),
    turnId = tostring(payload.turnId),
    question = tostring(payload.question),
    answer = tostring(payload.answer),
    outcome = tostring(payload.outcome),
    durationMs = tolong(payload.durationMs)
| order by sessionId asc, timestamp asc
```

## Grouped session summary

```kusto
traces
| where message startswith "SudoChatAnswer " or message startswith "SudoChatTurnError "
| extend payload = parse_json(substring(message, indexof(message, " ") + 1))
| extend
    australiaTime = tostring(payload.australiaTime),
    source = tostring(payload.source),
    visitorId = tostring(payload.visitorId),
    ipHash = tostring(payload.ipHash),
    sessionId = tostring(payload.sessionId),
    question = tostring(payload.question),
    answer = tostring(payload.answer),
    outcome = tostring(payload.outcome),
    durationMs = tolong(payload.durationMs)
| order by timestamp asc
| summarize
    firstSeen = min(timestamp),
    lastSeen = max(timestamp),
    turns = count(),
    conversation = make_list(pack(
      "time", australiaTime,
      "question", question,
      "answer", answer,
      "outcome", outcome,
      "durationMs", durationMs
    ))
  by source, visitorId, ipHash, sessionId
| order by lastSeen desc
```

## Questions submitted without a completed answer

```kusto
let submitted = traces
| where message startswith "SudoChatQuestion "
| extend payload = parse_json(substring(message, strlen("SudoChatQuestion ")))
| project
    submittedAt = timestamp,
    sessionId = tostring(payload.sessionId),
    turnId = tostring(payload.turnId),
    source = tostring(payload.source),
    question = tostring(payload.question);
let completed = traces
| where message startswith "SudoChatAnswer " or message startswith "SudoChatTurnError "
| extend payload = parse_json(substring(message, indexof(message, " ") + 1))
| project turnId = tostring(payload.turnId);
submitted
| join kind=leftanti completed on turnId
| order by submittedAt desc
```

## Optional network correlation

Set an Azure Function App environment variable named `SUDOCHAT_VISITOR_HASH_SALT` to a long random secret. Keep it stable if you want the same network address to produce the same pseudonymous hash over time.

Do not put the salt in GitHub or browser code. The Function App hashes the address server-side and never writes the raw address to Application Insights.
