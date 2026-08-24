# SudoChat Threat Model

## Scope

This threat model covers the current public portfolio MVP and identifies controls that would be required before adapting the pattern to a real Federal Court environment.

Current public flow:

```text
Browser
  -> mustafa-siddiqui.com/sudochat.html
  -> Azure Function /api/token
  -> Direct Line token exchange
  -> Direct Line conversation
  -> Copilot Studio
  -> approved public SudoChat knowledge
  -> grounded answer + deterministic citation resolution
```

The public MVP is intentionally unauthenticated at the user level and contains only approved public knowledge. A real Court deployment would require a materially different identity, authorisation, data-classification and monitoring architecture.

## Trust boundaries

### TB1 - Public browser

Untrusted. A visitor controls input, browser state and network requests originating from their device.

Controls:
- Never place long-lived secrets in browser code.
- Treat all user input as untrusted.
- Do not rely on JavaScript controls as a security boundary.
- Fail safely when the AI service is unavailable.

### TB2 - Token gateway

Semi-trusted server-side boundary. It exchanges the server-only Direct Line secret for a short-lived conversation token.

Current controls observed in source:
- Direct Line secret is read from `COPILOT_DIRECTLINE_SECRET` server configuration.
- Production origin allow-list contains `https://mustafa-siddiqui.com` and `https://www.mustafa-siddiqui.com` in the repository branch reviewed.
- Present disallowed browser origins receive HTTP 403.
- Responses are marked `Cache-Control: no-store` for token responses.
- Safe client-facing error messages are returned instead of the secret.

Known limitations:
- Endpoint uses anonymous Azure Function access.
- CORS/origin validation is not authentication and does not stop non-browser callers from omitting or spoofing `Origin`.
- No durable rate limit or quota is implemented in the reviewed function source.
- Deployed Azure configuration may differ from the repository branch and must be verified before final sign-off.

### TB3 - Direct Line

Microsoft-managed conversation transport.

Controls:
- Browser receives a short-lived token rather than the channel secret.
- Tokens are refreshed before expiry.
- Conversations are scoped by conversation ID.

Residual risks:
- Stolen live tokens may be usable until expiry.
- Excessive anonymous token minting can create cost/abuse exposure.
- Client conversation state must be reset cleanly after errors.

### TB4 - Copilot Studio agent

Model/orchestration boundary. The model is probabilistic and must not be treated as an authority for identity, permissions, URLs or consequential actions.

Controls:
- Grounding instructions.
- Claim boundaries.
- False-premise correction.
- Insufficient-evidence abstention.
- Public-only knowledge for MVP.
- Scope restriction.

Residual risks:
- Prompt injection.
- Retrieval miss followed by over-confident denial.
- Source conflict.
- Unsupported synthesis.
- Excessive answer length or repetition.

### TB5 - Knowledge sources

Approved public KB pages are trusted as authored evidence, but retrieved content must still be treated as data rather than executable instructions.

Controls:
- Canonical source IDs.
- Deterministic source manifest.
- Public disclosure boundaries.
- `Do not claim` sections.

Future Court requirements:
- authority level;
- effective date;
- superseded/archived status;
- security classification;
- matter ID;
- user/role access scope;
- source owner;
- review date;
- retention requirement.

## Threat register

| ID | Threat | Impact | Current mitigation | Remaining action |
| --- | --- | --- | --- | --- |
| T01 | Direct Line secret exposed to browser/GitHub | Critical | Secret remains server-side in environment variable | Secret scan repository/history; document rotation process |
| T02 | Public token endpoint abuse | High | Origin validation + secured Direct Line channel | Add durable rate limiting/quota or upstream gateway protection; monitor token mint rate |
| T03 | CORS treated as authentication | High | Documented as browser-origin control only | Keep explicit in Engine Room/security docs; add abuse control independent of CORS |
| T04 | Prompt injection from user | High | Agent instructions and scope rules | Build adversarial regression suite |
| T05 | Indirect injection from retrieved document | Critical in future Court use | Public curated KB only reduces exposure | Explicit instruction/data separation + document sanitisation + injection tests |
| T06 | Hallucinated employment/project claims | High | Grounded retrieval + claim boundaries | Atomic KB sources + retrieval evaluation |
| T07 | Retrieval miss becomes false denial | High | Instructions now distinguish absence of retrieval from negative evidence | Add targeted retrieval tests for career/project facts |
| T08 | Invented source URL | High | Deterministic citation manifest | Continue rejecting unresolved internal destinations |
| T09 | Cross-matter leakage | Critical in Court design | Not applicable to public portfolio KB | Mandatory identity/authorisation/matter-scoped retrieval before Court use |
| T10 | Stale or superseded authority | Critical in Court design | Not yet relevant to candidate KB | Metadata + authority hierarchy + review workflow |
| T11 | Sensitive user content logged | High | No intentional application conversation logging in current frontend design | Verify Azure/Application Insights behaviour and redact/minimise logs |
| T12 | Error logs include upstream sensitive detail | Medium | User receives generic errors | Review server logging; never log tokens/secrets; minimise upstream bodies |
| T13 | Token theft | Medium | Short-lived Direct Line token | HTTPS only, no persistent storage, avoid logging token, consider tighter session handling |
| T14 | Unlimited model/tool action | Critical in agentic Court design | MVP is information-focused | Least-privilege tools + deterministic execution + approval gates |
| T15 | Dependency compromise | Medium | Very small dependency surface | Routine dependency audit and remove unnecessary packages/node_modules from repo |
| T16 | Content injection via future KB updates | High | Curated sources | Review/gated publishing workflow + canonical allow-list + integrity checks |
| T17 | Denial of service / cost exhaustion | High | None beyond platform limits | Rate limits, quotas, monitoring, optional challenge mechanism if abused |
| T18 | Session contamination / stale Direct Line activity | Medium | Watermark drain, turn timestamps, reply filtering and session reset | Regression-test long and failed conversations |
| T19 | Browser XSS via model output | High | Answer renderer escapes HTML; citations built through DOM/escaped attributes | Regression-test HTML/script payloads in model text and source labels |
| T20 | Misrepresentation as Court-endorsed system | High | Explicit disclaimer and false-premise rule | Keep disclaimer visible and test endorsement prompts |

## Public MVP vs Court deployment

The current architecture is appropriate only for approved public portfolio knowledge. A Court deployment would require additional controls before any protected information or enterprise action is introduced:

```text
User
  -> Entra identity
  -> role + matter authorisation
  -> policy enforcement point
  -> approved retrieval boundary
  -> classified/authoritative knowledge
  -> model
  -> output validation
  -> citations + uncertainty
  -> human decision-maker

Agent action path:
LLM recommendation
  -> permission check
  -> deterministic tool
  -> validation
  -> human approval where consequential
  -> execution
  -> audit event
```

## Security principles to show in the Engine Room

1. Secret != browser token.
2. CORS != authentication.
3. Retrieved text != trusted instruction.
4. Model output != authorised action.
5. Citation text != authoritative URL.
6. User identity != permission to every source.
7. Human sign-off != meaningful human control unless the human can independently assess the evidence.
8. Public PoC controls cannot be presented as a production Court security architecture.

## Final security review checklist

Before declaring the public MVP final:

- Verify deployed Azure Function origin configuration.
- Verify localhost is removed from production CORS unless deliberately required.
- Search repository and commit history for accidental secrets.
- Confirm Copilot Studio "Require secured access" remains enabled.
- Confirm token endpoint returns `Cache-Control: no-store`.
- Add rate limiting or document an explicit accepted MVP risk with monitoring.
- Verify Direct Line token refresh and failed-session reset.
- Review Application Insights/logging for token or conversation leakage.
- Test XSS payloads and malformed citation metadata.
- Test prompt injection and scope bypasses.
- Review dependency surface.
- Document secret rotation using Secret 1/Secret 2.
- Document incident response if the public endpoint is abused.

## References

Security design should be checked against current Microsoft documentation before final publication, particularly Copilot Studio web channel security, Direct Line tokens, Power Platform security guidance and Azure API Management rate limiting.