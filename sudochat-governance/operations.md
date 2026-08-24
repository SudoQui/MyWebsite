# SudoChat Observability and Operations Plan

## Goal

SudoChat should demonstrate that AI systems must be operated, measured and reviewed after deployment. The portfolio MVP does not need a large production monitoring stack, but it should have a clear operational model and a small set of useful quality and reliability signals.

## Minimum telemetry

Track aggregated operational metrics where practical without storing unnecessary conversation content.

| Metric | Why it matters | Suggested measurement |
| --- | --- | --- |
| Request count | Understand usage and cost exposure | Count submitted chat turns |
| Successful answer rate | Basic reliability | Completed grounded responses / submitted turns |
| End-to-end latency | User experience | Submit timestamp to rendered final answer |
| Token endpoint failures | Gateway reliability/security | HTTP status counts for `/api/token` |
| Direct Line send failures | Transport reliability | Count non-2xx send responses |
| Direct Line response timeouts | Agent/transport reliability | Count timeout exceptions |
| Session resets | Stability | Count forced Direct Line session resets |
| Retrieval miss / abstention rate | Knowledge coverage | Count insufficient-evidence responses in eval harness; avoid logging raw public user text unless needed |
| Citation resolution failures | Provenance quality | Count unresolved internal source identities |
| Guardrail failures | Safety quality | Measured through controlled evaluation, not inferred from public users |
| Evaluation pass rate | Regression control | Passed tests / total tests by release/model/KB version |

## Privacy-first logging

Do not log more user content than is necessary to operate the public portfolio.

Preferred model:

```text
request_id
start_time
end_time
latency_ms
status
error_class
conversation_transport_status
citation_count
citation_resolution_status
model_or_agent_version_if_available
kb_version
```

Avoid by default:

- Direct Line secrets;
- Direct Line tokens;
- full request/response bodies;
- private identifiers;
- arbitrary conversation transcripts;
- upstream authentication headers.

If controlled evaluation transcripts are retained, keep them separate from public-user telemetry and label them as synthetic/test data.

## Reliability states

### Healthy

- token endpoint available;
- Direct Line conversation starts;
- final response returns within target latency;
- citations resolve where evidence exists.

### Degraded

- slow response;
- partial citation resolution;
- retrieval abstention on a question known to be covered;
- model output requires retry but public page still functions.

### Unavailable

- token gateway unreachable;
- Direct Line unavailable;
- Copilot agent unavailable.

User-facing behaviour: the static portfolio and Engine Room remain usable and the chat displays a generic service-unavailable state without exposing infrastructure details.

## Suggested service targets for the portfolio demo

These are internal engineering targets, not external SLAs.

- Token endpoint: >99% success during controlled testing.
- Chat turn success: >95% during the evaluation run.
- Typical simple grounded question: target <8 seconds where model/service conditions permit.
- No unresolved canonical citation for high-priority evaluation questions.
- Zero critical guardrail failures in the release regression set.
- Zero secrets or live tokens in client logs/repository.

## Quality monitoring

Operational uptime alone is not sufficient for an AI system.

Track quality separately:

```text
Grounding
Retrieval accuracy
Claim fidelity
Abstention accuracy
False-premise correction
Citation correctness
Conversation continuity
Prompt-injection resistance
Response conciseness
Latency
```

A model or KB change should be treated as a release that can regress quality even when the code does not change.

## Release metadata

For each significant evaluation run record:

```json
{
  "run_id": "eval-YYYYMMDD-NN",
  "date": "YYYY-MM-DD",
  "agent_model": "record selected Copilot model",
  "kb_version": "git commit or content release identifier",
  "frontend_commit": "git SHA",
  "gateway_version": "deployment identifier if available",
  "questions": 0,
  "pass_rate": 0,
  "critical_guardrail_failures": 0,
  "notes": ""
}
```

This lets Mustafa demonstrate that changes to the model, instructions and knowledge base are evaluated rather than assumed to be improvements.

## Incident playbooks

### Public endpoint abuse

1. Confirm unusual token/request volume.
2. Apply or tighten rate limiting/upstream blocking.
3. Disable the public token route temporarily if necessary.
4. Rotate Direct Line secret if compromise is suspected.
5. Confirm secret never reached client/browser logs.
6. Restore service after controls are verified.

### Secret exposure

1. Regenerate/swap the affected Copilot Studio Direct Line secret immediately.
2. Update the server-side Azure application setting.
3. Redeploy/restart if required.
4. Search repository/history/logs for the exposure path.
5. Treat tokens minted from the old secret as compromised until expiry/disconnection.
6. Document the incident and prevention action.

### Grounding regression

1. Capture the controlled failing question and actual answer.
2. Determine whether the failure is retrieval, knowledge coverage, generation/instruction following, citation resolution or conversation state.
3. Fix the correct layer rather than simply making the prompt longer.
4. Add the failure as a permanent regression test.
5. Re-run related guardrails before release.

### Bad citation

1. Identify the source identity returned by Copilot/Direct Line.
2. Verify canonical manifest mapping.
3. Never patch by trusting the model-generated URL.
4. Add the source identity/alias only if it maps unambiguously to approved evidence.
5. Re-run citation-order and inline-marker tests.

## Cost controls

The public MVP is intentionally anonymous, so cost abuse is a real operational consideration.

Controls in increasing order of complexity:

1. monitor token mint/request volume;
2. durable rate limit at an upstream gateway or API layer;
3. daily quota/circuit breaker;
4. optional challenge/bot protection if abuse appears;
5. temporarily disable chat while leaving the static portfolio available.

CORS and origin validation should not be counted as cost-abuse prevention because a non-browser client can call the public endpoint directly.

## Engine Room presentation

The final Engine Room should communicate operations with a compact lifecycle:

```text
BUILD
  -> EVALUATE
  -> RELEASE
  -> OBSERVE
  -> REVIEW FAILURES
  -> IMPROVE KB / RETRIEVAL / GUARDRAILS
  -> RE-EVALUATE
```

This demonstrates that an AI system is a maintained service rather than a one-time model integration.