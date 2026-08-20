# SudoChat Technical Architecture

## Purpose

SudoChat is an interactive AI engineering portfolio hosted as part of `mustafa-siddiqui.com`.

The product has three primary user journeys:

1. About Mustafa
2. Why Mustafa for the Federal Courts
3. About this Agent

The Court proposal is explicitly an independent engineering concept based on public research. It is not intended to imitate a production Court service or provide legal advice.

## Architecture status legend

`[MVP]` Required before the application release.

`[FINAL]` Added after the application release to deepen the engineering demonstration.

## Final technical architecture

```text
Recruiter / Interviewer
        │
        ▼
mustafa-siddiqui.com/sudochat.html
        │
        ▼
[ MVP ] Custom Web UI
HTML + CSS + JavaScript
Accessible, responsive, no sign in
        │
        ▼
[ MVP ] Secure Chat Gateway
Azure Function or equivalent server side endpoint
Input validation
Rate limiting
Origin allow list
Secrets stay server side
        │
        ▼
[ MVP ] Microsoft Copilot Studio Agent
Conversation orchestration
Grounding instructions
Abstention behaviour
Role aware responses
        │
        ├───────────────────────────────┐
        ▼                               ▼
[ MVP ] Curated KB                [ FINAL ] Retrieval Service
Profile                            Azure AI Search or equivalent
Experience                         Hybrid keyword + vector retrieval
Projects                           Metadata filters
Authored answers                   Provenance IDs
Court role research                Review dates
Agent documentation                Canonical evidence URLs
        │                               │
        └───────────────┬───────────────┘
                        ▼
                 [ MVP ] Guardrails
                 Unsupported claim refusal
                 False premise handling
                 Scope restrictions
                 Sensitive data boundaries
                 Court proposal disclaimers
                        │
                        ▼
                 Grounded answer
                        │
                 ┌──────┴──────┐
                 ▼             ▼
        [ MVP ] Evidence    [ FINAL ] Provenance service
        Portfolio links      Answer classification
        GitHub links         Source IDs
        KB sources           Citation validation
                 │             │
                 └──────┬──────┘
                        ▼
                    Visitor

Cross cutting final services

[ FINAL ] Evaluation harness
[ FINAL ] Observability and quality telemetry
[ FINAL ] Content review workflow
[ FINAL ] GitHub knowledge synchronisation
[ FINAL ] Artifact build time log
[ FINAL ] Advanced Court AI research explorer
```

## MVP release

### 1. Custom public page

Route: `https://mustafa-siddiqui.com/sudochat.html`

Requirements:

1. No recruiter account
2. No Microsoft sign in
3. No download required
4. Works on managed desktop browsers and mobile
5. Portfolio remains readable when chat is unavailable
6. External evidence opens in a new tab

### 2. Custom chat interface

The user sees three primary focus areas.

1. About Mustafa
2. Why Mustafa for the Courts
3. About this Agent

Suggested prompts populate the composer. They do not send until the visitor presses Enter.

After the first message, the landing identity collapses and the interface becomes chat focused.

### 3. Secure gateway

The browser must not contain Copilot Studio secrets or long lived credentials.

The public page calls a server side endpoint.

Recommended initial implementation:

`api.mustafa-siddiqui.com/sudochat`

The gateway performs:

1. Maximum request size validation
2. Basic rate limiting
3. Origin validation
4. Request timeout
5. Safe error handling
6. Copilot token or agent session management

### 4. Copilot Studio

Copilot Studio is intentionally retained in the MVP because the target role specifically calls for Microsoft Copilot Agent capability.

The system prompt must require:

1. Evidence based answers
2. Transparent experience gaps
3. Refusal to invent achievements
4. Separation of verified facts and Mustafa's authored views
5. No legal advice
6. No claim of Court endorsement
7. Safe handling of unsupported questions

### 5. MVP knowledge base

Minimum content before the application release:

```text
/about
profile.md
education.md
technical_skills.md

/experience
xaana_ai.md
unisys.md
nova_systems.md
questacon.md
current_work.md

/projects
sudochat.md
cve_agent.md
motorcycle_hud.md
mact.md

/court
target_role.md
why_courts.md
why_mustafa.md
why_el1.md
copilot_experience.md
responsible_ai.md
mission.md

/agent
architecture.md
why_rag.md
guardrails.md
privacy.md

/authored_answers
approximately 20 high value responses
```

### 6. Evidence behaviour

Answers may return source objects.

```json
{
  "answer": "Mustafa has applied computer vision in document processing and MotorHUD.",
  "provenance": "Synthesised from verified evidence",
  "sources": [
    {
      "label": "MotorHUD project",
      "url": "https://mustafa-siddiqui.com/project.html?id=motorhud"
    },
    {
      "label": "GitHub",
      "url": "https://github.com/SudoQui"
    }
  ]
}
```

The frontend renders only valid HTTP or HTTPS links and opens them in a new tab.

### 7. Critical MVP evaluation set

The MVP should not ship until a small critical suite passes.

Test at minimum:

1. Normal retrieval
2. Cross source synthesis
3. False premise
4. Unsupported experience
5. Experience gap
6. Prompt injection
7. Sensitive information request
8. Role alignment
9. Evidence request
10. Unknown preference
11. Court proposal disclaimer
12. Legal advice boundary

## Final architecture

### 1. Retrieval service

The final system should move beyond relying entirely on generic document grounding.

Recommended design:

Azure AI Search or equivalent hybrid retrieval.

Each knowledge item stores metadata such as:

```yaml
id: answer_copilot_experience
type: authored_answer
category: court_fit
author: Mustafa Siddiqui
public: true
last_reviewed: 2026-08-20
canonical_url: https://...
questions:
  - How much Copilot Studio experience does Mustafa have?
evidence:
  - project_sudochat
  - education_ai
```

This allows retrieval to filter by document type, public status, freshness and provenance.

### 2. Provenance service

The final system should not rely on the LLM to invent citation URLs.

Retrieval returns canonical source IDs.

A deterministic resolver maps source IDs to approved public links.

Response classes:

1. Verified evidence
2. Mustafa's authored perspective
3. Synthesised answer
4. Insufficient evidence

### 3. Evaluation harness

Target at least 50 evaluation questions.

Metrics:

1. Grounded answer rate
2. Retrieval accuracy
3. Citation accuracy
4. Abstention accuracy
5. Hallucination rate
6. Prompt injection resistance
7. Role alignment quality
8. Response latency

### 4. Observability

Record:

1. Request success or failure
2. Latency
3. Retrieval misses
4. Citation resolution failures
5. Model or service errors
6. Evaluation regressions

Do not log unnecessary personal content.

### 5. Build timeline

The public page reads GitHub history for `sudochat.html` to show actual first and latest revision timestamps.

Major artifacts should additionally have a manually tracked build log.

Example:

```json
{
  "artifact": "Federal Courts system concept whiteboard",
  "started_at": "2026-08-21T09:00:00+10:00",
  "completed_at": "2026-08-21T12:42:00+10:00",
  "active_minutes": 222
}
```

This permits a truthful statement such as:

`Tracked design time: 3h 42m`

Git commit timestamps should be described as development history, not active work time.

### 6. Federal Courts proposal

The research explorer must visibly separate:

1. What I know
2. What I infer
3. What I would ask
4. What I propose

Only after research is complete should Mustafa publish the whiteboard system design.

The LLM can then explain the whiteboard, its assumptions, controls and tradeoffs.

### 7. Failure mode

If the AI service is unavailable, the page still provides:

1. About Mustafa
2. Project links
3. Engine Room
4. Architecture
5. Public evidence
6. Court research
7. Evaluation results

The AI feature fails gracefully rather than taking the portfolio offline.

## Copyright and attribution

Recommended site notice:

> © 2026 Mustafa Siddiqui. Unless otherwise stated, original text, diagrams, system designs, interface designs, research synthesis and authored responses on this site are copyright Mustafa Siddiqui. Public facts, third party material, trademarks and linked content remain the property of their respective owners. Reproduction or redistribution of original material requires permission.

This is intentionally narrower than claiming copyright over every fact or idea. Copyright protects original expression, while public facts and third party material should not be represented as Mustafa's property.

## Court disclaimer

Recommended notice:

> SudoChat is an independent portfolio proof of concept. It is not affiliated with or endorsed by the Federal Circuit and Family Court of Australia or the Federal Court of Australia. Court related concepts are based on public research and are presented as independent engineering proposals. SudoChat does not provide legal advice.
