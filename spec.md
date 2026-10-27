# AI Mystery Room --- Product & Technical Specification

**Document status:** Source of truth for implementation\
**Version:** 1.0\
**Product:** AI Mystery Room\
**Stack:** MongoDB, Express.js, React, Node.js (MERN)\
**AI provider:** Google Gemini\
**Primary goal:** Turn a user's short fictional scenario into a
playable, fair, evidence-based mystery investigation.

------------------------------------------------------------------------

## 1. Source-of-truth rules

This document defines the required MVP. When implementation details are
not specified, choose the simplest secure, maintainable solution
consistent with this document. Do not silently invent extra product
features or change the rules below.

-   The backend is authoritative for mystery creation, evidence storage,
    answer validation, scoring, and reveal of the culprit.
-   Treat all mysteries as **fictional, AI-generated experiences**.
    Display a clear fictional-content notice.
-   Gemini output is untrusted input. Validate it against schemas and
    business rules before saving or showing it.
-   Never let the frontend determine the correct culprit or scoring.
-   Never expose the solution, hidden motives, or private answer key
    through player-facing APIs before submission.
-   Do not fabricate real WhatsApp messages, real people, or real CCTV
    recordings. Render fictional chat transcripts and clearly labelled
    AI-generated/illustrative visuals or clips.
-   If a requirement conflicts with this spec, this spec wins unless the
    product owner explicitly revises it.

## 2. Product overview

A player submits a short story or scenario (for example, "A trophy
disappeared from a college lab after the annual event"). The application
creates a fictional investigation containing a case briefing, suspects,
a timeline, and evidence such as chat transcripts, witness statements,
images, and CCTV-style scene reconstructions. The player reviews the
evidence and selects the culprit, optionally entering a short
explanation. The app then reveals the canonical solution, explains how
the evidence supports it, and displays the result.

### Product principles

1.  **Fair play:** The correct culprit must be determinable from
    evidence visible to the player.
2.  **Consistency:** The culprit, motives, timeline, statements, and
    evidence must not contradict one another.
3.  **Clarity:** Evidence is easy to browse and distinguish by type.
4.  **Immersion without deception:** Use a detective/case-file
    aesthetic, but label fictional and AI-generated content.
5.  **Graceful failure:** If generation fails validation, retry safely
    or show a useful error; never present a broken mystery as playable.

## 3. MVP scope

### In scope

-   Landing page and mystery creation form.
-   Scenario input with validation and optional difficulty selection.
-   Backend Gemini integration to generate a complete mystery package.
-   Structured case briefing and suspect profiles.
-   Evidence room with text evidence and optional AI-generated visual
    assets.
-   Evidence filtering by type and evidence detail view.
-   Culprit selection and final accusation submission.
-   Result screen with correct/incorrect outcome, explanation, and
    evidence references.
-   Save mystery and game progress in MongoDB.
-   Responsive layout, loading states, empty states, error states, basic
    accessibility.
-   Demo mode using a seeded mystery if Gemini is not configured.

### Out of scope for MVP

-   Real user-to-user messaging or multiplayer.
-   Live CCTV integrations, actual surveillance, or real WhatsApp
    integrations.
-   Payments, subscriptions, leaderboards, public profiles, and social
    sharing.
-   Guaranteed video generation. CCTV evidence can initially be a
    text-based incident log or a still image with a fictional timestamp.
-   User-uploaded evidence, unless added in a later explicitly approved
    scope.
-   Claims that generated evidence is authentic or from real
    investigations.

## 4. Users and core journey

### Primary user

A person who enjoys detective puzzles and wants to create and solve a
custom fictional mystery.

### Main user flow

1.  Visit landing page.
2.  Enter a scenario (required); choose difficulty (optional, default
    `medium`).
3.  Submit and see a generation/loading screen with progress copy.
4.  Backend generates, validates, and saves a mystery.
5.  Player opens the case file and reads the briefing.
6.  Player reviews suspects and evidence.
7.  Player selects one suspect and submits the accusation.
8.  Backend evaluates the answer and stores the result.
9.  Result page reveals the culprit, reasoning, key clues, and final
    score.
10. Player can start a new mystery or replay the current case (replay
    behavior should reset the attempt, not regenerate the story).

## 5. Functional requirements

### FR-01 --- Landing page

-   Explain the product in one sentence: create a fictional mystery and
    solve it using evidence.
-   Primary CTA: **Create a Mystery**.
-   Show three steps: Describe a scenario → Investigate evidence →
    Identify the culprit.
-   Show a clear notice: "All cases and evidence are fictional and may
    be AI-generated."
-   Include a sample case preview or demo mystery.

### FR-02 --- Scenario form

-   Required scenario field, trimmed before submission.
-   MVP validation: 30--1,000 characters. Display the count and a clear
    validation message.
-   Optional difficulty: `easy`, `medium`, `hard`; default `medium`.
-   Optional theme/category: `theft`, `disappearance`, `sabotage`,
    `mystery`, `other`; default `mystery`.
-   Do not promise user-selected evidence types in MVP.
-   Disable duplicate submissions while a request is in progress.
-   Handle unsupported, abusive, real-person-targeting, or clearly
    non-fictional accusations safely; steer the user toward fictional
    scenarios.
-   Show a recoverable error if the service fails. Preserve the user's
    scenario text.

### FR-03 --- Mystery generation

The backend must ask Gemini for one complete structured mystery. Use
schema-constrained JSON output where supported, but still validate the
returned data in application code.

Each mystery must contain: - `title` - `premise` - `incident` -
`difficulty` - `suspects` (3--5) - `timeline` (at least 4 ordered
events) - `evidence` (at least 6 items across at least 3 evidence
types) - `solution` (server-only until accusation) -
`generationMetadata` (model name if available, generation time, schema
version)

Generation rules: - Exactly one canonical culprit, and the culprit ID
must match one suspect. - Every suspect must have a name/label, role,
public profile, possible motive, and alibi. - At least 3 suspects must
be plausible before all evidence is reviewed. - Evidence must include
both incriminating and exculpatory/contextual details. - The solution
must cite at least 3 evidence IDs and explain how each supports or
weakens a theory. - The visible evidence must support the canonical
solution; do not rely on hidden facts. - Include at least one red
herring, but do not make it stronger than the real solution. - Timeline
order and timestamps must be internally consistent. - Evidence should
not directly disclose the culprit in its title or preview. - Use
fictional names and fictional institutions. Do not present evidence as
real-world proof. - No real contact details, real account identifiers,
or personally identifying data. - If output is malformed or fails
business validation, retry generation once with a repair prompt. If it
still fails, return a controlled error and do not save it as playable. -
Do not return the `solution` object to the client until the accusation
has been submitted.

### FR-04 --- Evidence types

Support these normalized types: - `chat_transcript`: fictional chat
conversation, rendered as a chat UI; not a real messaging-platform
export. - `image`: illustrative generated image or placeholder with
caption and alt text. - `cctv_log`: fictional camera event log with
time, location, observations, and limitations. A later version may
attach a generated still image/video. - `witness_statement`:
first-person fictional statement. - `document`: note, receipt, report,
or other fictional text document. - `physical_clue`: description of an
object or scene.

Every evidence item includes `id`, `type`, `title`, `summary`,
`content`, `timestamp` or `timeLabel`, `location` if relevant,
`reliability` (`low`, `medium`, `high`), and `relatedSuspectIds`. Do not
show hidden `solution` reasoning in evidence payloads.

### FR-05 --- Case file and suspect views

-   Show case title, premise, incident, difficulty, and progress.
-   Suspects appear as separate cards with name, role, short profile,
    and alibi.
-   Motive information can be shown as a "possible motive" but must not
    be framed as proof.
-   Evidence detail view must show the full content, type,
    timestamp/time label, reliability, and related suspects if present.
-   Filter evidence by type; sort by timeline order or newest/oldest
    where timestamps exist.
-   Provide a clear route back to the case overview.
-   On mobile, use a stacked layout; on desktop, use a two-column
    case/evidence layout where practical.

### FR-06 --- Accusation

-   Player selects exactly one suspect.
-   Optional explanation field, maximum 500 characters.
-   Require confirmation before final submission.
-   One final submission per play session in MVP. Prevent accidental
    duplicate submissions and reject repeated final submissions from the
    API.
-   The client sends only `suspectId` and optional `reason`; never
    accept a client-provided correctness flag or score.
-   Backend compares the selected suspect ID with the stored canonical
    culprit ID.
-   Return result, solution, explanation, evidence references, and score
    only after submission.
-   If no suspect is selected, show inline validation and do not call
    the API.

### FR-07 --- Results and reveal

-   Clearly state correct or incorrect.
-   Reveal culprit identity and full explanation.
-   Show the strongest supporting clues and evidence links/IDs.
-   Explain why the main alternative suspects were not responsible.
-   Display score and a "Create another mystery" action.
-   Do not claim a detailed reasoning process that is unsupported by the
    generated case. Present a concise, evidence-grounded explanation.
-   Results must be reproducible from the stored mystery and submitted
    answer.

### FR-08 --- Persistence and sessions

-   Save mysteries, suspects, timeline, evidence, solution, and
    generation metadata in MongoDB.
-   MVP may use anonymous play sessions with an opaque random session
    ID. Do not use predictable sequential IDs.
-   A player must only be able to read or submit against a mystery
    accessible to their session.
-   If account authentication is not implemented, use a signed,
    HTTP-only session cookie or a securely generated opaque token; do
    not treat a MongoDB ID alone as authorization.
-   Persist completion status and result so refresh does not lose the
    case or result.
-   Add expiration/cleanup policy for abandoned anonymous cases,
    configurable by environment variable.

### FR-09 --- Demo/fallback

-   Provide one seeded demo mystery that can be played without a Gemini
    API key.
-   When Gemini is unavailable, allow the user to open the demo and show
    a clear banner that it is a sample case.
-   Do not silently substitute a demo mystery for a user's submitted
    scenario.

## 6. UX and visual direction

### Design concept

A modern detective case-management interface: dark navy/charcoal
surfaces, warm paper/off-white evidence panels, restrained amber
accents, subtle borders, readable typography, and clear visual
hierarchy. Avoid excessive neon, clutter, or tiny text. The experience
should feel intriguing but remain accessible.

### Required pages/routes

-   `/` --- landing page.
-   `/create` --- scenario creation form.
-   `/case/:caseId` --- case overview and evidence room.
-   `/case/:caseId/accuse` --- accusation form (can also be a section of
    the case page if the UI remains clear).
-   `/case/:caseId/result` --- result/reveal, accessible only after a
    completed submission.
-   A not-found page and a user-friendly error state.

### UI states

-   Idle, validating, generating, generation failed, loading case, case
    loaded, no evidence filter results, submitting accusation,
    submission failed, completed result, not found, expired/unavailable
    session.
-   Use skeletons or progress indicators during network calls.
-   Never leave the user on an infinite spinner.
-   Provide retry controls for transient failures.
-   Use toast notifications only for non-critical feedback; inline
    messages for form errors.

### Accessibility

-   Semantic headings and landmarks.
-   Keyboard-accessible controls and visible focus.
-   Sufficient contrast.
-   Form labels independent of placeholders.
-   Images require meaningful alt text; decorative images use empty alt
    text.
-   Do not rely on color alone to indicate correct/incorrect results.
-   Respect reduced-motion preferences.

## 7. Technical architecture

### Frontend

-   React with Vite.
-   React Router for page navigation.
-   Fetch or Axios for API calls; choose one and use it consistently.
-   A small shared API client that handles JSON, credentials, and
    normalized errors.
-   Component-level state is acceptable for MVP; use a context/store
    only if shared state becomes genuinely necessary.
-   Never store Gemini API keys or server-only solution data in frontend
    code, environment variables prefixed for client exposure, browser
    storage, or network responses before submission.

### Backend

-   Node.js with Express.
-   Mongoose for MongoDB models and validation.
-   Gemini SDK for server-side generation.
-   Centralized error middleware and request validation.
-   Separate route, controller, service, model, validation/schema, and
    prompt modules.
-   Use environment variables and validate required configuration at
    startup.
-   Use structured logs without logging API keys, session tokens, or
    sensitive user input unnecessarily.

### Suggested repository structure

``` text
ai-mystery-room/
  README.md
  SPEC.md
  .env.example
  .gitignore
  package.json                 # optional workspace scripts
  client/
    package.json
    vite.config.js
    src/
      app/
      components/
      pages/
      features/
        mystery/
        evidence/
        accusation/
      services/api.js
      hooks/
      styles/
      utils/
      main.jsx
  server/
    package.json
    src/
      app.js
      server.js
      config/
      routes/
      controllers/
      services/
        geminiService.js
        mysteryService.js
        scoringService.js
      models/
      validators/
      prompts/
      middleware/
      utils/
      seed/
        demoMystery.js
    tests/
```

Codex may adjust folder names if the same separation of concerns is
maintained. Do not create needless abstractions.

## 8. Data model

### Mystery document

``` js
{
  _id: ObjectId,
  schemaVersion: 1,
  title: String,
  originalScenario: String,
  premise: String,
  incident: String,
  difficulty: "easy" | "medium" | "hard",
  category: String,
  suspects: [{
    id: String,
    name: String,
    role: String,
    profile: String,
    possibleMotive: String,
    alibi: String
  }],
  timeline: [{
    id: String,
    timestamp: String,       // ISO 8601 or explicitly fictional time label
    event: String,
    relatedSuspectIds: [String],
    relatedEvidenceIds: [String]
  }],
  evidence: [{
    id: String,
    type: String,
    title: String,
    summary: String,
    content: Mixed,          // validated by type-specific schema
    timestamp: String,
    timeLabel: String,
    location: String,
    reliability: "low" | "medium" | "high",
    relatedSuspectIds: [String],
    asset: {
      url: String,
      altText: String,
      generated: Boolean,
      fictionalLabel: String
    }
  }],
  solution: {
    culpritSuspectId: String,
    motive: String,
    explanation: String,
    supportingEvidenceIds: [String],
    alternativeSuspectExplanations: [{ suspectId: String, explanation: String }]
  },
  generationMetadata: {
    provider: "gemini",
    model: String,
    schemaVersion: Number,
    generatedAt: Date,
    attempts: Number
  },
  status: "ready" | "failed",
  createdAt: Date,
  expiresAt: Date
}
```

### PlaySession document

``` js
{
  _id: ObjectId,
  mysteryId: ObjectId,
  sessionTokenHash: String,
  status: "in_progress" | "completed",
  selectedSuspectId: String,
  submittedReason: String,
  isCorrect: Boolean,
  score: Number,
  startedAt: Date,
  submittedAt: Date,
  expiresAt: Date
}
```

Implementation requirements: - Use unique IDs for suspects, evidence,
and timeline entries within each mystery. - Validate all
suspect/evidence references before saving. - Hash opaque session tokens
before persisting them if tokens are stored in the database. - Add
indexes for expiry, mystery lookup, and session lookup. - Use a TTL
index for expiring sessions/cases only if TTL behavior matches the
product's retention requirements. - Do not expose raw session token
hashes or private solution fields in public JSON. - Store only evidence
metadata and asset URLs in MongoDB; do not store large binary files in
documents.

## 9. Gemini generation contract

### Server-side request

Send Gemini: - The user's scenario after length and safety validation. -
Chosen difficulty and category. - The required JSON schema/shape. -
Rules for unique culprit, fair evidence, consistent timeline,
fictional-only content, and no real personal data. - A request to
produce concise, engaging text suitable for a general audience.

### Expected structured response

``` json
{
  "title": "The Missing Trophy",
  "premise": "A trophy vanished from a locked college lab...",
  "incident": "The trophy was last seen at 18:00...",
  "difficulty": "medium",
  "suspects": [],
  "timeline": [],
  "evidence": [],
  "solution": {
    "culpritSuspectId": "suspect_2",
    "motive": "A fictional motive",
    "explanation": "Evidence-grounded solution",
    "supportingEvidenceIds": ["evidence_1", "evidence_3", "evidence_5"],
    "alternativeSuspectExplanations": []
  }
}
```

This is illustrative only; the arrays must be fully populated and
validated before use.

### Validation after Gemini

Validate: - JSON parses successfully and matches the expected schema. -
All required fields are non-empty and within configured size limits. -
Suspect count is 3--5. - Evidence count is at least 6 and contains at
least 3 supported types. - Timeline contains at least 4 entries and can
be consistently ordered. - Culprit ID references an existing suspect. -
All related suspect/evidence IDs reference existing records. -
Supporting evidence IDs exist and are shown to the player. - The
solution does not depend on a fact absent from visible evidence. -
Exactly one culprit is designated. - No malformed asset URL, unsupported
data type, or oversized output is accepted. - If image generation is not
implemented/configured, use safe illustrative placeholders rather than
pretending an image was generated.

### Generation reliability

-   Use a configurable request timeout.
-   Retry once for malformed/invalid model output with a concise repair
    prompt.
-   Do not retry indefinitely.
-   Handle rate limits, quota exhaustion, invalid API key, network
    failures, and safety refusals with appropriate server error codes.
-   Do not return raw provider errors or prompts to the browser.
-   Add a configurable maximum scenario length and generation limit per
    session/IP.
-   Record provider/model and attempt count, but do not log secrets.

## 10. API contract

All endpoints return JSON. Use a consistent envelope:

``` json
{ "data": {}, "error": null }
```

or on failure:

``` json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields."
  }
}
```

### `POST /api/mysteries`

Creates and validates a mystery. Request:

``` json
{
  "scenario": "A trophy disappeared from a college lab after an event.",
  "difficulty": "medium",
  "category": "theft"
}
```

Success: `201 Created`; return `caseId`, safe case overview, suspects,
timeline, evidence, and session bootstrap details as needed. **Do not
return `solution` or any hidden culprit field.** If generation fails,
return a controlled `502` or suitable service error.

### `GET /api/mysteries/:caseId`

Returns the safe case view for an authorized play session. Never
includes the solution object, culprit ID, hidden prompts, or internal
validation notes. Return `404` for unknown or unauthorized cases if that
avoids leaking existence.

### `GET /api/mysteries/:caseId/evidence/:evidenceId`

Returns a single evidence item after checking session access. Does not
include hidden solution data.

### `POST /api/mysteries/:caseId/accusation`

Request:

``` json
{
  "suspectId": "suspect_2",
  "reason": "The time record conflicts with the alibi."
}
```

Success: `200 OK`; atomically marks the session complete and returns:

``` json
{
  "data": {
    "isCorrect": true,
    "selectedSuspectId": "suspect_2",
    "score": 100,
    "result": {
      "culpritSuspectId": "suspect_2",
      "culpritName": "A fictional suspect",
      "motive": "A fictional motive",
      "explanation": "A concise evidence-based explanation",
      "supportingEvidenceIds": ["evidence_1", "evidence_3", "evidence_5"],
      "alternativeSuspectExplanations": []
    }
  },
  "error": null
}
```

The above response is illustrative. Return the real stored result only
after successful submission. Never accept `isCorrect`, `score`, or
culprit identity from the client.

### `GET /api/mysteries/:caseId/result`

Returns the saved result only if the session is completed. Otherwise
return `409 RESULT_NOT_AVAILABLE`.

### API status codes

-   `400` invalid body, invalid IDs, or invalid selection.
-   `401` missing/invalid session where authentication is required.
-   `404` case/evidence/session unavailable.
-   `409` already submitted or result not available.
-   `413` request too large.
-   `422` scenario rejected by product validation.
-   `429` rate limit exceeded.
-   `502` upstream AI generation failure.
-   `500` unexpected internal error.

## 11. Scoring rules

MVP scoring: - Correct culprit: 100 points. - Incorrect culprit: 0
points. - Optional written explanation is saved but does not affect
score. - Do not use Gemini to grade the explanation in MVP; this avoids
nondeterministic scores. - One final accusation per session. - Score is
calculated on the server and stored with the result.

## 12. Security, privacy, and abuse prevention

-   Keep `GEMINI_API_KEY`, MongoDB URI, session secrets, and other
    secrets server-side only.
-   Commit `.env.example`, never real `.env` files or API keys.
-   Validate and sanitize request bodies; use schema validation (e.g.,
    Zod or Joi).
-   Apply rate limiting to mystery generation and accusation endpoints.
-   Configure CORS to the known frontend origin; do not use wildcard
    credentials.
-   Use Helmet and safe error handling.
-   Limit JSON body size and AI output size.
-   Use secure, HTTP-only, SameSite cookies in production; set `Secure`
    under HTTPS.
-   Prevent IDOR: every case, evidence, result, and accusation request
    must verify session ownership.
-   Avoid rendering model output as raw HTML. Escape text; sanitize any
    rich content.
-   Do not place hidden answers in React props, page source, logs
    visible to clients, or public API responses.
-   Clearly identify fictional material. Never use real-person
    allegations or claim generated images are authentic evidence.
-   Provide a privacy notice explaining that the scenario is sent to
    Google Gemini for generation and stored by the application.
-   Do not collect more personal information than necessary.

## 13. Environment and setup

### `server/.env.example`

``` dotenv
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ai_mystery_room
GEMINI_API_KEY=
GEMINI_MODEL=
SESSION_SECRET=replace_with_a_long_random_secret
SESSION_TTL_HOURS=24
MYSTERY_TTL_DAYS=7
GENERATION_TIMEOUT_MS=45000
MAX_SCENARIO_LENGTH=1000
RATE_LIMIT_WINDOW_MS=60000
GENERATION_RATE_LIMIT=5
```

Use a Gemini model available to the project's configured API key; do not
hardcode a model name without checking SDK/API compatibility.
`GEMINI_MODEL` should be documented and validated.

### Local development

-   Frontend: `http://localhost:5173`
-   Backend: `http://localhost:5000`
-   MongoDB: local MongoDB or configured MongoDB Atlas URI.
-   Add root scripts for `dev`, `build`, `test`, and `lint` where
    practical.
-   Document prerequisites, environment setup, seed/demo mode, and
    troubleshooting in `README.md`.

## 14. Testing requirements

### Unit tests

-   Scenario validation rejects empty, too-short, too-long input.
-   Gemini JSON parser handles malformed output safely.
-   Mystery validator rejects invalid culprit IDs, missing evidence,
    dangling references, and insufficient suspect/evidence counts.
-   Scoring returns 100 for a correct suspect and 0 for an incorrect
    suspect.
-   Solution fields are removed from player-facing serialization.

### API/integration tests

-   Mystery creation succeeds with a mocked valid Gemini response.
-   Invalid Gemini output triggers one repair attempt and then a
    controlled error if still invalid.
-   GET case/evidence never exposes solution fields.
-   Accusation works for a valid suspect.
-   Invalid suspect ID is rejected.
-   Duplicate accusation returns `409`.
-   Result endpoint is blocked before submission and available
    afterward.
-   A different session cannot access another session's case.
-   Rate limit and AI-provider failure paths are handled.

### UI tests / manual checks

-   Create form validation and character count.
-   Loading, success, failure, retry, and demo states.
-   Evidence filters and detail panel.
-   Accusation cannot submit without a selection.
-   Correct and incorrect result screens.
-   Responsive layouts at mobile and desktop widths.
-   Keyboard-only navigation and visible focus.

## 15. Definition of done / acceptance criteria

The MVP is complete only when: 1. A user can enter a valid scenario and
generate a playable mystery using Gemini. 2. The application validates
the generated case before saving it. 3. Each case has 3--5 suspects, at
least 6 evidence items, at least 3 evidence types, and at least 4
timeline entries. 4. The canonical culprit is uniquely defined and
supported by visible evidence. 5. The user can inspect evidence and
submit exactly one accusation. 6. The server calculates the result and
only then reveals the solution. 7. Refreshing the page preserves the
case and completed result within the session's lifetime. 8. Private
solution data is absent from all pre-submission client responses. 9. The
seeded demo works without a Gemini key. 10. Errors, timeouts, invalid
model output, and rate limits are handled without crashes or infinite
loading. 11. `.env` and secrets are not committed. 12. Automated tests
cover core validators, scoring, access control, and API behavior. 13.
README explains installation, configuration, running, testing, and demo
mode. 14. The UI is responsive and keyboard navigable. 15. The
fictional/AI-generated notice is visible in the creation and evidence
experience.

## 16. Implementation sequence for Codex

Build in these phases and keep the app runnable at the end of each
phase.

**Phase 1 --- Foundation** - Create client/server structure, scripts,
environment validation, Express app, Mongo connection, React router,
base design system, and health endpoint. - Add README and
`.env.example`.

**Phase 2 --- Domain and demo** - Implement schemas/models, seeded demo
mystery, safe serialization, session model, validators, and
deterministic scoring. - Test that the solution is never returned before
submission.

**Phase 3 --- UI shell** - Implement landing, creation form, case
overview, suspects, evidence filters/details, accusation, and result
screens using the demo case first.

**Phase 4 --- Gemini integration** - Implement structured prompt, SDK
call, response parsing, validation, one repair retry, timeout, and
controlled errors. - Mock Gemini in automated tests.

**Phase 5 --- API integration and persistence** - Connect frontend to
API; persist cases and sessions; enforce access checks and
one-submission rule.

**Phase 6 --- Hardening** - Add rate limits, security headers, body
limits, error states, responsive/accessibility checks, and tests.

**Phase 7 --- Verification** - Run lint, tests, and production build.
Fix failures rather than hiding them. - Verify every acceptance
criterion and update README. - Do not claim a check passed unless it was
actually run.

## 17. Instructions for Codex

Before coding: 1. Read this entire `SPEC.md`. 2. Inspect the existing
repository and preserve useful working code. 3. Summarize the
implementation plan and identify any conflicts with existing code. 4.
Implement the MVP in the phases above; do not stop after generating a
plan. 5. If the repo already contains an implementation, inspect it
before replacing files. 6. Prefer small, testable modules and explicit
schemas over one large controller or component. 7. Keep this
specification authoritative. If a code change requires a product-level
change, explain it and update this spec only when explicitly instructed.
8. Never expose secrets or the answer key in client-visible data. 9. Run
available tests and build commands; report actual results and remaining
issues. 10. Do not add unrequested paid services or assume image/video
generation is available. Use placeholders for visual evidence unless a
separate image/video provider is explicitly configured.

**MVP success definition:** A user can describe a fictional incident,
receive a coherent validated case, inspect multiple kinds of evidence,
accuse one suspect, and see an evidence-based reveal---with private
solution data protected until the accusation is submitted.
