Date created: 2026-09-03
Date last modified: 2026-09-03

# Sprint 2: MCQ Management — Technical PRD

## Overview/Problem

Sprint 1 gave teachers a way to register, log in, and land on a placeholder MCQ page, but they still cannot create or manage questions. Teachers need to build a personal test bank of multiple-choice questions: add questions with named choices, edit them later, preview how a student would answer, and delete questions they no longer need.

This sprint replaces the `/mcqs` stub with a full MCQ management experience backed by D1 persistence and REST API routes. Session management remains out of scope, so user ownership columns exist in the schema but are stored as `NULL` until a future sprint adds authentication state.

---

## Hypothesis

We believe that providing create, read, update, delete, and preview flows for multiple-choice questions will let teachers build and validate their test-bank content without waiting for session management or student-facing quiz delivery.

---

## Scope

### In Scope

- Replace the `/mcqs` stub with a real MCQ list page
- D1 schema for questions, choices, and attempts (with migrations)
- MCQ service layer centralizing all D1 queries
- REST API routes: list, create, get one, update, delete, and record attempt
- Zod validation on all write endpoints (consistent with Sprint 1 auth routes)
- Create and edit pages sharing one form component
- Preview page where a teacher selects an answer and receives server-verified feedback
- Attempt recording in D1 on each preview submission
- Delete confirmation via Alert Dialog
- Actions dropdown (edit, preview, delete) per table row
- Test-driven development across all phases
- Workers-runtime verification and documentation close-out

### Out of Scope

- Session management (cookies, JWT, server-side sessions, auth middleware)
- Filtering questions by teacher or logged-in user
- Other question types (true/false, short answer, matching, etc.)
- Question bank organization (categories, tags, folders)
- Search, sorting controls, or pagination on the list page
- Sharing questions between teachers
- Quizzes, assignments, grading reports, or analytics dashboards
- Image uploads or rich-text editors for question content
- Student-facing flows (student login, taking assigned quizzes)
- End-to-end (E2E) browser automation framework (Playwright, Cypress, etc.)
- Toast notifications or animation libraries

### Cut

- **Server Actions for MCQ mutations** — Sprint 1 established REST API routes with Zod validation and consistent error shapes. This sprint follows the same pattern rather than introducing Server Actions for MCQ forms. Forms call the API from client components.
- **Auth middleware / route protection** — Requires session management, which is explicitly excluded. Anyone can navigate to `/mcqs` and its sub-routes by URL, consistent with Sprint 1.
- **Populating `created_by` / `user_id` at runtime** — Schema columns and foreign keys are in place for future work, but values are `NULL` until sessions exist. See Known Limitations.
- **Revealing the correct answer on a wrong preview attempt** — Preview feedback is limited to "Correct" or "Incorrect". The correct choice is not disclosed, keeping the preview closer to a student experience.
- **Partial choice updates on PATCH** — Updating a question replaces all choices in a single transaction (delete existing choices, insert new ones). Simpler than per-choice upsert for this sprint.
- **Dedicated preview API returning shuffled choices** — Choices are returned in `sort_order`. Randomization is out of scope.

### Explicitly Not Building

The following are **not** part of this sprint. If implementation reveals a dependency on any of these, stop and ask before building it:

| Item | Reason |
|------|--------|
| Sessions / cookies / JWT | Documented Sprint 1 limitation; unchanged |
| Auth middleware | Depends on sessions |
| Other question types | MCQ only |
| Categories, tags, folders | Scope control |
| Search, sort, pagination | Scope control |
| Cross-teacher sharing | Scope control |
| Quizzes, grading, analytics | Scope control |
| Image uploads, rich text | Scope control |
| Student-facing flows | Scope control |
| E2E test framework | Scope control |
| Toast / animation packages | Scope control |

---

## Known Limitations

### No session management (carried forward from Sprint 1)

Sprint 1 deliberately ships without cookies, JWT, or a session store. Login stores user info in `sessionStorage` for display only; there is no server-side way to identify the current user on a subsequent API request.

**Impact on Sprint 2:**

| Column | Table | Behavior |
|--------|-------|----------|
| `created_by` | `mcq_questions` | `NULL` on insert. FK to `users(id)` exists for schema correctness. |
| `user_id` | `mcq_attempts` | `NULL` on insert. FK to `users(id)` exists for schema correctness. |

**List behavior:** `GET /api/mcqs` returns **all** questions in the database. No per-teacher filtering.

**Future work:** When session management is added, populate these columns and filter lists by `created_by`. No schema migration should be needed beyond making the application logic session-aware.

This approach was chosen over building session plumbing in Sprint 2 because it preserves the correct data model without scope creep.

---

## Technical Requirements

### Stack Alignment

Per `AGENTS.md`, Sprint 1 PRD, and project rules:

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router, React 19 |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (SQLite), binding `DB` |
| UI | Tailwind CSS v4, shadcn/ui (`base-nova`), Lucide icons |
| Validation | Zod |
| Testing | Vitest, `@testing-library/react`, `userEvent` |

No new npm dependencies are expected beyond shadcn/ui components added via the CLI (`textarea`, `dropdown-menu`, `alert-dialog`, `radio-group`). If a dependency beyond these is needed, propose it before adding.

### Database Schema

Migration file: `migrations/0002_create_mcq_tables.sql`

```sql
CREATE TABLE mcq_questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  question_text TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mcq_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  sort_order INTEGER NOT NULL
);

CREATE TABLE mcq_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  selected_choice_id TEXT NOT NULL REFERENCES mcq_choices(id),
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mcq_choices_question_id ON mcq_choices(question_id);
CREATE INDEX idx_mcq_attempts_question_id ON mcq_attempts(question_id);
```

| Table | Column | Type | Required | Notes |
|-------|--------|------|----------|-------|
| `mcq_questions` | `id` | TEXT | Yes | Primary key |
| | `name` | TEXT | Yes | Short display name / title for the question |
| | `question_text` | TEXT | Yes | Full question prompt |
| | `created_by` | TEXT | No | FK → `users(id)`; `NULL` until sessions exist |
| | `created_at` | DATETIME | Yes | Set on insert |
| | `updated_at` | DATETIME | Yes | Updated on every change |
| `mcq_choices` | `id` | TEXT | Yes | Primary key |
| | `question_id` | TEXT | Yes | FK → `mcq_questions(id)` ON DELETE CASCADE |
| | `choice_text` | TEXT | Yes | Answer option text |
| | `is_correct` | INTEGER | Yes | `0` or `1`; exactly one per question enforced in app layer |
| | `sort_order` | INTEGER | Yes | `0`-based display order |
| `mcq_attempts` | `id` | TEXT | Yes | Primary key |
| | `question_id` | TEXT | Yes | FK → `mcq_questions(id)` ON DELETE CASCADE |
| | `user_id` | TEXT | No | FK → `users(id)`; `NULL` until sessions exist |
| | `selected_choice_id` | TEXT | Yes | FK → `mcq_choices(id)` |
| | `is_correct` | INTEGER | Yes | Computed server-side from stored `is_correct` on the choice |
| | `attempted_at` | DATETIME | Yes | Set on insert |

**Cascade behavior:** Deleting a question deletes its choices and attempts.

Apply locally only:

```bash
npx wrangler d1 migrations create quiz-app-db create_mcq_tables
npx wrangler d1 migrations apply quiz-app-db --local
```

Never apply migrations to the remote database from automated agents.

### API Endpoints

All endpoints live under `src/app/api/`. Request and response bodies are JSON. All write inputs validated with Zod before use.

**Common error shape** (matches Sprint 1):

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

**JSON field naming:** camelCase in API JSON; snake_case in D1 columns. Service layer maps between them.

---

#### GET /api/mcqs

List all MCQ questions. No pagination, search, or sort parameters.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "questions": [ ...questionSummary ] }` |
| 500 | Server error |

`questionSummary` object (choices omitted from list):

```json
{
  "id": "abc123",
  "name": "Chapter 5 Review",
  "questionText": "What is the capital of France?",
  "createdBy": null,
  "createdAt": "2026-09-03T10:00:00.000Z",
  "updatedAt": "2026-09-03T10:00:00.000Z"
}
```

Default ordering: `created_at DESC` (newest first).

---

#### POST /api/mcqs

Create a new question with choices.

**Request Body:**

```json
{
  "name": "Chapter 5 Review",
  "questionText": "What is the capital of France?",
  "choices": [
    { "choiceText": "Paris", "isCorrect": true },
    { "choiceText": "London", "isCorrect": false },
    { "choiceText": "Berlin", "isCorrect": false }
  ]
}
```

| Field | Validation |
|-------|------------|
| `name` | Required, trimmed, 1–200 chars |
| `questionText` | Required, trimmed, 1–5000 chars |
| `choices` | Array, min 2, max 6 |
| `choices[].choiceText` | Required, trimmed, 1–1000 chars |
| `choices[].isCorrect` | Boolean |
| Cross-field | Exactly one choice must have `isCorrect: true` |

`created_by` is set to `NULL` (no session).

**Response:**

| Status | Body |
|--------|------|
| 201 | `{ "question": { ...fullQuestion } }` |
| 400 | Validation error (`VALIDATION_ERROR`) |
| 500 | Server error |

`fullQuestion` includes the `choices` array with server-generated `id` and `sortOrder` on each choice.

---

#### GET /api/mcqs/[id]

Get one question with all choices. Used by the **edit** page. Includes `isCorrect` on each choice.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "question": { ...fullQuestion } }` |
| 404 | `{ "error": "Question not found", "code": "QUESTION_NOT_FOUND" }` |
| 500 | Server error |

---

#### GET /api/mcqs/[id]/preview

Get question data for the **preview** page. Same as full question but choices **omit** `isCorrect` so the client cannot determine the answer before submitting.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "question": { "id", "name", "questionText", "choices": [{ "id", "choiceText", "sortOrder" }] } }` |
| 404 | Question not found |
| 500 | Server error |

---

#### PATCH /api/mcqs/[id]

Update a question. Replaces all choices in a transaction.

**Request Body:** Same shape as POST create body.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "question": { ...fullQuestion } }` |
| 400 | Validation error |
| 404 | Question not found |
| 500 | Server error |

---

#### DELETE /api/mcqs/[id]

Delete a question. Cascades to choices and attempts.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "success": true }` |
| 404 | Question not found |
| 500 | Server error |

---

#### POST /api/mcqs/[id]/attempts

Record a preview attempt. **Correctness is determined entirely on the server** by looking up the selected choice in D1 and reading its `is_correct` flag. The client sends only `selectedChoiceId`; it does not send whether the answer is correct.

**Request Body:**

```json
{
  "selectedChoiceId": "choice-id-here"
}
```

| Field | Validation |
|-------|------------|
| `selectedChoiceId` | Required, non-empty string |

**Server logic:**

1. Load question by `id` from route param; 404 if missing.
2. Load choice by `selectedChoiceId`; 400 if choice does not belong to this question.
3. Read `is_correct` from the choice row in D1 (do not trust any client-supplied correctness flag).
4. Insert row into `mcq_attempts` with `user_id = NULL`.
5. Return `{ "isCorrect": true | false }`.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "isCorrect": true }` or `{ "isCorrect": false }` |
| 400 | Validation error or invalid choice for question (`INVALID_CHOICE`) |
| 404 | Question not found |
| 500 | Server error |

---

### User Interface Requirements

All pages extend the existing `/mcqs` route (Sprint 1 uses `/mcqs`, not `/mcq`). Use shadcn/ui components throughout. No raw `<button>`, `<input>`, or `<table>` elements.

**New shadcn components to add** (Phase 4, via CLI):

```bash
npx shadcn@latest add @shadcn/textarea
npx shadcn@latest add @shadcn/dropdown-menu
npx shadcn@latest add @shadcn/alert-dialog
npx shadcn@latest add @shadcn/radio-group
```

---

#### MCQ List Page (`/mcqs`)

Replaces `McqStub`. Server Component fetches from `GET /api/mcqs` or calls the service layer directly.

- Page heading: "MCQ Test Bank"
- **Create Question** button at the top → navigates to `/mcqs/new`
- Table (`Table` component) listing all questions with columns:
  - **Name** — `name` field
  - **Question** — `questionText` field (truncate long text in the cell if needed)
  - **Actions** — three-vertical-dots icon (`EllipsisVertical` from Lucide) opening a `DropdownMenu` with:
    - **Edit** → `/mcqs/[id]/edit`
    - **Preview** → `/mcqs/[id]/preview`
    - **Delete** → opens `AlertDialog` confirmation; on confirm calls `DELETE /api/mcqs/[id]` and refreshes the list
- Empty state when no questions exist: message + Create button
- Retain logout affordance from Sprint 1 stub (or via `AppHeader` if appropriate)

---

#### Create Page (`/mcqs/new`)

- Renders shared `McqQuestionForm` in create mode
- **Save** and **Cancel** buttons below the form, side by side, equal width (`flex` with `flex-1` on each button)
- Save → `POST /api/mcqs` → redirect to `/mcqs` on success
- Cancel → navigate back to `/mcqs` without saving
- Client-side validation mirrors server rules before submit

---

#### Edit Page (`/mcqs/[id]/edit`)

- Same `McqQuestionForm` in edit mode, pre-populated from `GET /api/mcqs/[id]`
- Save → `PATCH /api/mcqs/[id]` → redirect to `/mcqs` on success
- Cancel → navigate back to `/mcqs` without saving
- 404 handling if question does not exist

---

#### Shared Form Component (`McqQuestionForm`)

Used by both create and edit pages. Client component (`'use client'`).

**Fields:**

| Field | Component | Notes |
|-------|-----------|-------|
| Name | `Input` + `Label` | Required |
| Question text | `Textarea` + `Label` | Required |
| Choices | Dynamic list | See below |

**Choices section:**

- Start with **2 empty choice rows** (confirmed decision — meets the minimum of 2 without an extra click)
- Each row: `Input` for choice text + radio (or equivalent) to mark exactly one as correct
- **Add choice** button — appends a row up to maximum of 6
- **Remove** button per row — disabled when only 2 rows remain (cannot go below minimum)
- Validation: at least 2, at most 6, no empty choice text, exactly one correct

**Buttons (rendered by parent page, not inside the form component):**

- Save and Cancel side by side, equal width, below the form

---

#### Preview Page (`/mcqs/[id]/preview`)

- Fetches from `GET /api/mcqs/[id]/preview` (no `isCorrect` exposed)
- Displays question name, question text, and choices as a `RadioGroup`
- **Submit** button — disabled until a choice is selected
- On submit → `POST /api/mcqs/[id]/attempts` with `{ selectedChoiceId }`
- Display result: "Correct!" or "Incorrect." (no reveal of which choice was correct)
- Link or button to return to `/mcqs`
- 404 handling if question does not exist

---

## Implementation Phases

### Process Rules (all phases)

1. **TDD:** Write tests first. Run them and confirm they fail for the right reason. Then implement until they pass.
2. **Phase gate:** Complete one phase, then **stop and wait for explicit user approval** before starting the next.
3. **Commit per phase:** After approval, commit and push that phase's work to `sprint-2` as its own commit. Update this PRD's phase status marker and Current Status section in the same commit.
4. **Do not deploy** or apply remote D1 migrations unless explicitly asked.
5. **Verify:** Run `npm run lint`, `npm run build`, and `npm run test` before requesting phase review. Phase 5 additionally requires `npm run preview`.

---

### Phase 1: Database Schema and Migration — COMPLETED

**Objective:** Add D1 tables for questions, choices, and attempts.

**Approach:** TDD — write migration verification tests first, then create and apply the migration.

**Tasks:**

1. ✅ Write tests asserting the migration file exists and contains expected table/column/FK definitions
2. ✅ Create `migrations/0002_create_mcq_tables.sql` per schema above
3. ✅ Apply migration locally: `npx wrangler d1 migrations apply quiz-app-db --local`
4. ✅ Verify tables exist in local D1

**Deliverables:**

- `migrations/0002_create_mcq_tables.sql`
- `src/lib/verification/sprint2-phase1-migration.test.ts`

**Status:** COMPLETED

---

### Phase 2: MCQ Service Layer — PLANNED

**Objective:** Centralize all MCQ D1 queries in a service module, following `user-service.ts` patterns.

**Approach:** TDD — write `mcq-service.test.ts` first with mocked D1, then implement.

**Tasks:**

1. Add `src/lib/validation/mcq-schemas.ts` with Zod schemas (shared by service tests and API routes)
2. Write service tests covering:
   - Create question with choices (exactly one correct)
   - List all questions
   - Get question by id (with choices)
   - Get question for preview (choices without `isCorrect`)
   - Update question (replace choices)
   - Delete question (cascade)
   - Record attempt (server-side correctness lookup)
   - Validation rejections (too few/many choices, empty text, zero or multiple correct)
   - Not-found cases
3. Implement `src/lib/services/mcq-service.ts`
4. Add `src/lib/api/mcqs.ts` with shared helpers (`apiError`, `validationError`, `parseJsonBody`) mirroring `src/lib/api/users.ts`

**Deliverables:**

- `src/lib/validation/mcq-schemas.ts` + `mcq-schemas.test.ts`
- `src/lib/services/mcq-service.ts` + `mcq-service.test.ts`
- `src/lib/api/mcqs.ts` + `mcqs.test.ts`

**Status:** PLANNED

---

### Phase 3: API Routes — PLANNED

**Objective:** Expose MCQ operations as REST endpoints.

**Approach:** TDD — write route tests first, then implement handlers.

**Tasks:**

1. Write route tests for all endpoints (happy path + error paths)
2. Implement route handlers:
   - `src/app/api/mcqs/route.ts` — GET list, POST create
   - `src/app/api/mcqs/[id]/route.ts` — GET one, PATCH update, DELETE
   - `src/app/api/mcqs/[id]/preview/route.ts` — GET preview
   - `src/app/api/mcqs/[id]/attempts/route.ts` — POST attempt
3. Consistent error codes and camelCase JSON responses
4. Attempt endpoint must never trust client-supplied correctness

**Deliverables:**

- Route handlers under `src/app/api/mcqs/`
- `src/app/api/mcqs/mcq-routes.test.ts` (or split per route)

**Status:** PLANNED

---

### Phase 4: Frontend UI — PLANNED

**Objective:** Replace stub with full MCQ management UI.

**Approach:** TDD — write component tests first, then implement.

**Tasks:**

1. Add required shadcn components (`textarea`, `dropdown-menu`, `alert-dialog`, `radio-group`)
2. Write tests for:
   - `McqQuestionForm` — fields, add/remove choices, validation, correct-answer selection
   - `McqListTable` (or equivalent) — renders rows, dropdown actions, delete confirmation
   - `McqPreview` — radio selection, submit, result display
3. Build components:
   - `src/components/mcq/mcq-question-form.tsx` (shared create/edit)
   - `src/components/mcq/mcq-list.tsx` (table + actions)
   - `src/components/mcq/mcq-preview.tsx`
4. Build pages:
   - `src/app/mcqs/page.tsx` — replace stub with list
   - `src/app/mcqs/new/page.tsx` — create
   - `src/app/mcqs/[id]/edit/page.tsx` — edit
   - `src/app/mcqs/[id]/preview/page.tsx` — preview
5. Remove or repurpose `src/components/auth/mcq-stub.tsx` and its test
6. Save/Cancel buttons: equal width, side by side, below form

**Deliverables:**

- Pages and components under `src/app/mcqs/` and `src/components/mcq/`
- Component test files (`*.test.tsx`)
- Updated shadcn UI components

**Status:** PLANNED

---

### Phase 5: Verification and Documentation Close-out — PLANNED

**Objective:** Confirm the sprint meets acceptance criteria on the Workers runtime.

**Approach:** TDD — automated deliverable checklist test, then manual preview verification.

**Tasks:**

1. Write `src/lib/verification/sprint2-verification.test.ts` — deliverable file checklist
2. Run `npm run lint` — must pass
3. Run `npm run build` — must pass
4. Run `npm run test` — all tests pass
5. Run `npm run preview` — manually verify create, edit, preview, delete flows
6. Update `AGENTS.md` project description to reflect Sprint 2 scope
7. Mark acceptance criteria checkboxes in this PRD

**Deliverables:**

- `src/lib/verification/sprint2-verification.test.ts`
- Updated `AGENTS.md`
- Lint, build, test, and preview results documented in this PRD

**Status:** PLANNED

---

## Technical Implementation Details

### Key Files (planned)

| File | Purpose |
|------|---------|
| `migrations/0002_create_mcq_tables.sql` | Questions, choices, attempts schema |
| `src/lib/validation/mcq-schemas.ts` | Zod schemas for MCQ create/update/attempt |
| `src/lib/services/mcq-service.ts` | All D1 queries for MCQ domain |
| `src/lib/api/mcqs.ts` | Shared API helpers for MCQ routes |
| `src/app/api/mcqs/route.ts` | List and create |
| `src/app/api/mcqs/[id]/route.ts` | Get, update, delete |
| `src/app/api/mcqs/[id]/preview/route.ts` | Preview data (no correct flag) |
| `src/app/api/mcqs/[id]/attempts/route.ts` | Record attempt |
| `src/app/mcqs/page.tsx` | MCQ list page |
| `src/app/mcqs/new/page.tsx` | Create page |
| `src/app/mcqs/[id]/edit/page.tsx` | Edit page |
| `src/app/mcqs/[id]/preview/page.tsx` | Preview page |
| `src/components/mcq/mcq-question-form.tsx` | Shared create/edit form |
| `src/components/mcq/mcq-list.tsx` | Table with actions dropdown |
| `src/components/mcq/mcq-preview.tsx` | Preview with radio group |

### Implementation Patterns

**Database access** (per `d1.mdc`):

```typescript
const result = await db
  .prepare(
    `SELECT id, name, question_text, created_by, created_at, updated_at
     FROM mcq_questions
     ORDER BY created_at DESC`,
  )
  .all<McqQuestionRow>();
```

**Choice replacement on update** (transaction):

```typescript
await db.batch([
  db.prepare("DELETE FROM mcq_choices WHERE question_id = ?1").bind(questionId),
  // ... INSERT statements for new choices
  db.prepare("UPDATE mcq_questions SET name = ?1, question_text = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3")
    .bind(name, questionText, questionId),
]);
```

**Server-side attempt correctness** (never trust client):

```typescript
const choice = await findChoiceById(selectedChoiceId);
if (!choice || choice.question_id !== questionId) {
  return { error: "INVALID_CHOICE" };
}
const isCorrect = choice.is_correct === 1;
await insertAttempt({ questionId, selectedChoiceId, isCorrect, userId: null });
return { isCorrect: isCorrect === 1 };
```

**Route handler validation** (matches Sprint 1):

```typescript
const parsed = createMcqSchema.safeParse(body);
if (!parsed.success) {
  return validationError(parsed.error);
}
```

### Important Notes

- D1 is only reachable from server code. Do not import `mcq-service` into `'use client'` components.
- Use numbered placeholders (`?1`, `?2`) in all D1 prepared statements.
- `npm run dev` runs on Node; test D1 integration with `npm run preview` on the Workers runtime.
- The preview endpoint must not leak `isCorrect` before an attempt is submitted.
- The attempt endpoint must compute correctness from the `mcq_choices.is_correct` column in D1.
- Deleting a question cascades to choices and attempts via FK constraints.
- Update tests that reference `mcq-stub.tsx` when the stub is replaced in Phase 4.

---

## TDD Approach

| Phase | TDD | Test files (written first) |
|-------|-----|---------------------------|
| Phase 1 | Yes | Migration verification tests |
| Phase 2 | Yes | `mcq-schemas.test.ts`, `mcq-service.test.ts`, `mcqs.test.ts` |
| Phase 3 | Yes | `mcq-routes.test.ts` |
| Phase 4 | Yes | `mcq-question-form.test.tsx`, `mcq-list.test.tsx`, `mcq-preview.test.tsx` |
| Phase 5 | Yes | `sprint2-verification.test.ts` |

**Red-green-refactor cycle per phase:**

1. Write a failing test describing the expected behavior.
2. Run `npm run test` and confirm the failure message is meaningful (not a syntax error or missing import).
3. Implement the minimum code to pass.
4. Refactor if needed; tests must stay green.
5. Do not move to the next phase until the user approves.

---

## Acceptance Criteria

### Database

- [x] Migration `0002_create_mcq_tables.sql` creates `mcq_questions`, `mcq_choices`, and `mcq_attempts` tables
- [x] Foreign keys and `ON DELETE CASCADE` work as specified
- [x] `created_by` and `user_id` columns are nullable with FK references to `users`

### API

- [ ] `GET /api/mcqs` returns all questions without pagination
- [ ] `POST /api/mcqs` creates a question with 2–6 choices and exactly one correct
- [ ] `GET /api/mcqs/[id]` returns a question with choices including `isCorrect`
- [ ] `GET /api/mcqs/[id]/preview` returns choices without `isCorrect`
- [ ] `PATCH /api/mcqs/[id]` updates a question and replaces choices
- [ ] `DELETE /api/mcqs/[id]` deletes a question and cascades to choices and attempts
- [ ] `POST /api/mcqs/[id]/attempts` records an attempt and returns server-computed `isCorrect`
- [ ] All write endpoints reject invalid input with `400` and `VALIDATION_ERROR`
- [ ] Missing questions return `404` with `QUESTION_NOT_FOUND`
- [ ] Error shape matches Sprint 1 (`{ error, code }`)

### UI

- [ ] `/mcqs` shows a table of all questions with name, question text, and actions column
- [ ] Create button navigates to `/mcqs/new`
- [ ] Actions dropdown offers Edit, Preview, and Delete
- [ ] Delete shows Alert Dialog confirmation before removing
- [ ] Create and edit pages share `McqQuestionForm`
- [ ] Form starts with 2 empty choice rows; teacher can add up to 6
- [ ] Exactly one choice can be marked correct on the form
- [ ] Save and Cancel buttons are side by side with equal width below the form
- [ ] Preview page uses RadioGroup; submit shows Correct/Incorrect feedback
- [ ] Preview does not reveal the correct answer on a wrong attempt

### Process and quality

- [ ] All phases built test-first per TDD Approach table
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run preview` manual smoke test passes
- [ ] `AGENTS.md` updated to reflect Sprint 2

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| MCQ CRUD works end-to-end | All acceptance criteria pass | Automated tests + manual preview |
| Server-side attempt integrity | Client cannot fake correctness | Route test sends `isCorrect` in body; server ignores it |
| Test coverage of failure paths | Every validation rule has a failing test | Review test files per phase |
| Scope discipline | No out-of-scope features shipped | PRD Out of Scope / Explicitly Not Building lists unchanged |

---

## Dependencies

### External Dependencies

None. No new npm packages beyond shadcn CLI-added UI components.

### Internal Dependencies

| Module | Purpose |
|--------|---------|
| `users` table (Sprint 1) | FK target for `created_by` and `user_id` |
| `src/lib/services/user-service.ts` | Pattern reference for service layer |
| `src/lib/api/users.ts` | Pattern reference for API helpers |
| `src/lib/validation/user-schemas.ts` | Pattern reference for Zod schemas |
| `src/components/ui/table.tsx` | MCQ list table |
| `src/components/layout/app-header.tsx` | Shared header |
| `wrangler.jsonc` D1 binding `DB` | Database access |
| Vitest + Testing Library | TDD test harness (installed in Sprint 1) |

---

## Risks and Mitigation

### Technical Risks

- **Risk:** Preview endpoint accidentally exposes `isCorrect` in the response.
- **Mitigation:** Dedicated `/preview` route with a separate mapper that omits the field. Test asserts absence.

- **Risk:** Attempt endpoint trusts a client-supplied `isCorrect` field.
- **Mitigation:** Zod schema accepts only `selectedChoiceId`. Correctness read from D1. Test sends spoofed `isCorrect` and asserts server ignores it.

- **Risk:** Choice replacement on update leaves orphaned rows or breaks sort order.
- **Mitigation:** Use D1 `batch()` in a transaction. Tests verify old choices are gone and new order is correct.

- **Risk:** `npm run dev` (Node) hides D1 binding issues that appear on Workers.
- **Mitigation:** Phase 5 requires `npm run preview` verification.

### User Experience Risks

- **Risk:** Teacher expects questions to be private to them, but all questions are visible.
- **Mitigation:** Documented in Known Limitations. No per-user filtering until sessions exist.

- **Risk:** Teacher deletes a question accidentally.
- **Mitigation:** Alert Dialog confirmation before delete.

- **Risk:** Save/Cancel buttons render uneven widths on narrow screens.
- **Mitigation:** `flex` container with `flex-1` on both buttons; test or visual check in Phase 4.

---

## Troubleshooting Guide

_No entries yet — add problems and solutions as they arise during implementation._

---

## Notes for AI Agents

When working with this PRD:

1. Read Overview, Hypothesis, and Known Limitations first.
2. Do **not** build sessions, auth middleware, JWT, or cookies.
3. Do **not** populate `created_by` or `user_id` — store `NULL`.
4. Use D1 with migrations; never alter schema with ad-hoc SQL.
5. Centralize DB access in `src/lib/services/mcq-service.ts`; use numbered placeholders.
6. Follow TDD: tests first, confirm red, then implement green.
7. **Stop after each phase** and wait for explicit user approval before continuing.
8. After approval, commit + push to `sprint-2` and update phase status in this PRD.
9. Verify with `npm run lint`, `npm run build`, `npm run test` (and `npm run preview` in Phase 5).
10. Do not deploy or apply remote D1 migrations unless explicitly asked.
11. If a requirement seems to need something on the "Explicitly Not Building" list, ask first.

---

## Current Status

**Last Updated:** 2026-09-03
**Current Phase:** Phase 2 — MCQ Service Layer
**Status:** IN PROGRESS (Phase 1 deployed; Phase 2 not started)
**Branch:** `sprint-2`
**Next Steps:** Begin Phase 2 MCQ service layer (TDD)
