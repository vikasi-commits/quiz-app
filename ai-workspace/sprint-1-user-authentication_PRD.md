Date created: 2026-08-26
Date last modified: 2026-08-26

# Sprint 1: User Registration, Login, and Logout - Technical PRD

## Overview/Problem

Teachers need a shared platform to collaborate on building a test bank of multiple-choice questions (MCQs). Before any teacher can contribute questions, the application must identify who is using it. Today the quiz app is an unmodified starter with no user accounts, no database, and no way for one or many teachers to register or sign in.

Sprint 1 establishes the foundation: teachers can create accounts, sign in, sign out, and land on a placeholder page where MCQ creation will be built in a later sprint. This sprint does not deliver MCQ features, social login, token-based auth, or persistent session management.

---

## Hypothesis

We believe that providing email-and-password registration and login with a secure user store will let individual and collaborating teachers establish identity in the app, unblocking collaborative MCQ test-bank work in subsequent sprints.

---

## Scope

### In Scope

- User registration (sign up) with email and password
- User login (credential verification)
- User logout (client-side sign-out flow with a dedicated API endpoint)
- User database persisted in Cloudflare D1
- Password hashing at registration and hash comparison at login (passwords never stored or returned in plain text)
- REST API endpoints for user CRUD operations
- Dedicated REST API endpoints for register, login, and logout
- Frontend pages: registration, login, and an MCQ stub page
- Redirect to the MCQ stub page after successful registration or login
- Input validation on all API endpoints and forms (Zod)
- Database migrations for the users table

### Out of Scope

- MCQ creation, editing, deletion, or any MCQ CRUD
- Social / OAuth login (Google, Microsoft, etc.)
- Auth tokens (JWT, bearer tokens, API keys for user auth)
- Session management (server-side sessions, auth cookies, "remember me", session expiry, refresh tokens)
- Route protection / authorization middleware (anyone can navigate to `/mcqs` by URL in Sprint 1)
- Password reset or email verification
- Role-based access control (admin vs teacher)
- Rate limiting and bot protection (e.g. Turnstile)
- Automated test suite (no testing framework is installed yet)

### Cut

- **Server-side sessions or cookies for auth** — Explicitly excluded per Sprint 1 requirements. Login returns a success response with safe user fields; the client performs the redirect. Logout clears client-side state only. Persistent "logged in" state across browser refresh is not guaranteed in this sprint.
- **Protecting the MCQ stub route** — Requires session or token auth, which is out of scope. The stub page is a navigation target, not a secured resource, until a future sprint adds session management.
- **Merging register into generic POST /api/users** — Registration is a dedicated public endpoint with password hashing rules. Generic user CRUD uses separate endpoints with distinct semantics.
- **Server Actions instead of API routes** — Project conventions prefer Server Actions for form mutations, but this sprint explicitly requires HTTP API endpoints for register, login, logout, and user CRUD. Forms will call these endpoints from the client.

---

## Technical Requirements

### Stack Alignment

Per `AGENTS.md` and project rules:

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router, React 19 |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (SQLite), binding `DB` |
| UI | Tailwind CSS v4, shadcn/ui (`base-nova`), Lucide icons |
| Validation | Zod (to be added as a dependency) |
| Password hashing | `bcryptjs` (to be added; Workers-compatible with `nodejs_compat`) |

New dependencies require explicit approval before implementation: `zod`, `bcryptjs`, and `@types/bcryptjs`.

### Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
```

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | TEXT | Yes | Primary key; UUID-like hex string |
| `first_name` | TEXT | Yes | User's first name |
| `last_name` | TEXT | No | Optional |
| `email` | TEXT | Yes | Unique, case-insensitive for lookup |
| `password_hash` | TEXT | Yes | Output of bcrypt hash; never plain text |
| `created_at` | DATETIME | Yes | Set on insert |
| `updated_at` | DATETIME | Yes | Updated on profile/password change |

**Password rules (Sprint 1):**

- Minimum 8 characters
- Stored only as a bcrypt hash (cost factor 10–12)
- On login: hash the submitted password with bcrypt and compare to `password_hash` using a constant-time compare function provided by the library
- Password hash and plain password are never included in API responses

### API Endpoints

All endpoints live under `src/app/api/`. Request and response bodies are JSON. All inputs validated with Zod before use.

Common error shape:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Safe user object (never includes `password_hash`):

```json
{
  "id": "abc123...",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@school.edu",
  "createdAt": "2026-08-26T10:00:00.000Z",
  "updatedAt": "2026-08-26T10:00:00.000Z"
}
```

---

#### POST /api/auth/register

Creates a new user account. Hashes password before insert.

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@school.edu",
  "password": "securePass123"
}
```

| Field | Validation |
|-------|------------|
| `firstName` | Required, 1–100 chars, trimmed |
| `lastName` | Optional, max 100 chars, trimmed |
| `email` | Required, valid email format, normalized to lowercase |
| `password` | Required, min 8 chars |

**Response:**

| Status | Body |
|--------|------|
| 201 | `{ "user": { ...safe user object } }` |
| 400 | Validation error |
| 409 | `{ "error": "An account with this email already exists", "code": "EMAIL_TAKEN" }` |
| 500 | Server error |

---

#### POST /api/auth/login

Verifies email and password. Does **not** issue tokens or set session cookies.

**Request Body:**

```json
{
  "email": "jane@school.edu",
  "password": "securePass123"
}
```

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "user": { ...safe user object } }` |
| 400 | Validation error |
| 401 | `{ "error": "Invalid email or password", "code": "INVALID_CREDENTIALS" }` (same message for unknown email and wrong password) |
| 500 | Server error |

---

#### POST /api/auth/logout

Acknowledges logout. No server-side session exists to invalidate in Sprint 1. Client clears any local auth state and redirects.

**Request Body:** none (optional empty `{}`)

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "success": true }` |

---

#### POST /api/users

Creates a user programmatically (CRUD Create). Same validation and hashing rules as register. Intended for administrative or API-driven user creation.

**Request Body:** Same as `/api/auth/register`

**Response:** Same as `/api/auth/register` (201 with user, 409 on duplicate email)

> **Note:** In Sprint 1 there is no authorization layer. This endpoint is unauthenticated by design until a future sprint adds access control.

---

#### GET /api/users

Lists users. Returns safe user objects only (no passwords).

**Query Parameters (optional):**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Max results (cap at 100) |
| `offset` | number | 0 | Pagination offset |

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "users": [...], "total": 42 }` |
| 500 | Server error |

---

#### GET /api/users/[id]

Returns a single user by `id`.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "user": { ...safe user object } }` |
| 404 | `{ "error": "User not found", "code": "USER_NOT_FOUND" }` |
| 500 | Server error |

---

#### PATCH /api/users/[id]

Updates a user. All fields optional; at least one required.

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@school.edu",
  "password": "newSecurePass456"
}
```

- If `password` is provided, hash it before storing in `password_hash`
- If `email` is changed, enforce uniqueness
- Update `updated_at` on success

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "user": { ...safe user object } }` |
| 400 | Validation error |
| 404 | User not found |
| 409 | Email already taken |
| 500 | Server error |

---

#### DELETE /api/users/[id]

Permanently deletes a user.

**Response:**

| Status | Body |
|--------|------|
| 200 | `{ "success": true }` |
| 404 | User not found |
| 500 | Server error |

---

### User Interface Requirements

Use shadcn/ui components (`button`, `card`, `field`, `input`, `label`) and theme tokens from `globals.css`. Forms submit to the API endpoints above via `fetch` from client components.

#### Home / Landing (`/`)

- Redirect unauthenticated visitors to `/login`, or show links to **Log in** and **Register**
- Minimal branding copy: "Quiz App — Collaborative MCQ Test Bank"

#### Registration Page (`/register`)

- Form fields: First name (required), Last name (optional), Email (required), Password (required), Confirm password (required, must match)
- Client-side validation mirrors server rules before submit
- Submit → `POST /api/auth/register`
- On success → redirect to `/mcqs`
- On error → display message via `FieldError` or inline alert
- Link to `/login` for existing users

#### Login Page (`/login`)

- Form fields: Email (required), Password (required)
- Submit → `POST /api/auth/login`
- On success → store user object in React state (in-memory only; no localStorage unless explicitly added later) → redirect to `/mcqs`
- On error → display "Invalid email or password"
- Link to `/register` for new users

#### MCQ Stub Page (`/mcqs`)

- Placeholder for Sprint 2 MCQ creation
- Heading: "MCQ Test Bank" (or similar)
- Short message: "MCQ creation coming in the next sprint."
- Display logged-in user's first name if available from client state passed via redirect flow
- **Log out** button → `POST /api/auth/logout` → clear client state → redirect to `/login`
- No MCQ list, forms, or CRUD UI

#### Layout / Navigation

- Shared minimal header on auth and stub pages with app name
- No global auth state provider required for Sprint 1; page-level state is sufficient

---

## Implementation Phases

### Phase 1: Database and Infrastructure - COMPLETED

**Objective:** Add D1, migrations, and shared data-access layer.

**Tasks:**

1. ✅ Create D1 database via Wrangler and add `d1_databases` binding (`DB`) to `wrangler.jsonc`
2. ✅ Run `npm run cf-typegen` to type `env.DB`
3. ✅ Create migration for `users` table
4. ✅ Apply migration locally: `npx wrangler d1 migrations apply quiz-app-db --local`
5. ✅ Add `src/lib/services/user-service.ts` centralizing all D1 queries per `d1.mdc` rules
6. ✅ Add `src/lib/validation/user-schemas.ts` with Zod schemas
7. ✅ Add `src/lib/auth/password.ts` for hash and compare helpers

**Deliverables:**

- `migrations/0001_create_users.sql`
- `src/lib/services/user-service.ts`
- `src/lib/validation/user-schemas.ts`
- `src/lib/auth/password.ts`
- Updated `wrangler.jsonc`

**Deployed:** 2026-08-26 — infrastructure only; API routes and UI are Phase 2/3.

---

### Phase 2: API Routes - PLANNED

**Objective:** Implement all auth and user CRUD endpoints.

**Tasks:**

1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `POST /api/auth/logout`
4. `POST /api/users`
5. `GET /api/users`
6. `GET /api/users/[id]`
7. `PATCH /api/users/[id]`
8. `DELETE /api/users/[id]`
9. Map DB snake_case columns to camelCase in JSON responses
10. Consistent error handling across routes

**Deliverables:**

- Route handlers under `src/app/api/`
- No password or hash leakage in any response

---

### Phase 3: Frontend Pages - PLANNED

**Objective:** Registration, login, logout, and MCQ stub UI.

**Tasks:**

1. Build `/register` page with form and API integration
2. Build `/login` page with form and API integration
3. Build `/mcqs` stub page with logout action
4. Update `/` landing with navigation to auth pages
5. Style with shadcn/ui and Tailwind theme tokens
6. Handle loading and error states on all forms

**Deliverables:**

- `src/app/register/page.tsx`
- `src/app/login/page.tsx`
- `src/app/mcqs/page.tsx`
- Updated `src/app/page.tsx`

---

### Phase 4: Verification - PLANNED

**Objective:** Confirm the sprint meets acceptance criteria.

**Tasks:**

1. Run `npm run lint` — must pass
2. Run `npm run build` — must pass
3. Run `npm run preview` and manually test register, login, logout, and CRUD via API
4. Verify passwords are hashed in D1 local database
5. Update `AGENTS.md` project description to reflect Sprint 1 scope

**Deliverables:**

- Lint and build passing
- Manual test notes recorded in this PRD's Troubleshooting section if issues arise

---

## Technical Implementation Details

### Key Files (planned)

| File | Purpose |
|------|---------|
| `wrangler.jsonc` | D1 binding configuration |
| `migrations/0001_create_users.sql` | Users table schema |
| `src/lib/services/user-service.ts` | D1 queries (prepared statements, numbered placeholders) |
| `src/lib/validation/user-schemas.ts` | Zod schemas shared by API routes |
| `src/lib/auth/password.ts` | `hashPassword()` and `verifyPassword()` |
| `src/app/api/auth/register/route.ts` | Registration endpoint |
| `src/app/api/auth/login/route.ts` | Login endpoint |
| `src/app/api/auth/logout/route.ts` | Logout endpoint |
| `src/app/api/users/route.ts` | List and create users |
| `src/app/api/users/[id]/route.ts` | Get, update, delete user |
| `src/app/register/page.tsx` | Registration UI |
| `src/app/login/page.tsx` | Login UI |
| `src/app/mcqs/page.tsx` | MCQ stub + logout |

### Implementation Patterns

**Database access (per `d1.mdc`):**

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

const { env } = await getCloudflareContext();
const result = await env.DB.prepare(
  "SELECT id, first_name, last_name, email, created_at, updated_at FROM users WHERE email = ?1 COLLATE NOCASE"
)
  .bind(normalizedEmail)
  .all<UserRow>();
const user = result.results[0];
```

**Password hashing:**

```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**Route handler validation:**

```typescript
const parsed = registerSchema.safeParse(await request.json());
if (!parsed.success) {
  return Response.json({ error: "Validation failed", code: "VALIDATION_ERROR" }, { status: 400 });
}
```

### Important Notes

- D1 is only reachable from server code. Database modules must not be imported into `'use client'` components.
- Use numbered placeholders (`?1`, `?2`) in all D1 prepared statements.
- Email lookup should be case-insensitive (`COLLATE NOCASE` or normalize to lowercase before query).
- Login errors must not reveal whether the email exists (always return `INVALID_CREDENTIALS`).
- `npm run dev` runs on Node; test D1 integration with `npm run preview` on the Workers runtime.
- Never apply migrations to the remote D1 database from automated agents; local only.
- Update `.dev.vars.example` if any secrets are introduced (none expected for Sprint 1 beyond local D1).

---

## Acceptance Criteria

- [ ] A teacher can register with first name, email, and password; optional last name is supported
- [ ] Duplicate email registration returns 409 with a clear error message
- [ ] Passwords are stored as bcrypt hashes in D1; plain-text passwords never appear in the database
- [ ] A teacher can log in with correct email and password and receives a safe user object (no password fields)
- [ ] Login with wrong email or password returns 401 with a generic "Invalid email or password" message
- [ ] After successful registration, the user is redirected to `/mcqs`
- [ ] After successful login, the user is redirected to `/mcqs`
- [ ] Logout calls `POST /api/auth/logout`, clears client state, and redirects to `/login`
- [ ] MCQ stub page displays placeholder content and a logout control; no MCQ CRUD is present
- [ ] `GET /api/users`, `GET /api/users/[id]`, `PATCH /api/users/[id]`, and `DELETE /api/users/[id]` work as specified
- [ ] `POST /api/users` creates a user with the same rules as register
- [ ] All API inputs are validated with Zod; invalid input returns 400
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Manual smoke test passes on `npm run preview` (register → login → logout flow)

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Registration completion | User reaches `/mcqs` after sign-up | Manual test / redirect observation |
| Login success rate | Valid credentials return 200 | API test with known user |
| Password security | 100% of stored passwords are bcrypt hashes | Inspect local D1 data |
| Zero password leakage | No API response includes plain or hashed password | Response inspection |
| Build health | Lint and build pass | CI / local `npm run lint` and `npm run build` |

---

## Dependencies

### External Dependencies (to be added)

| Package | Purpose |
|---------|---------|
| `zod` | Request and form validation |
| `bcryptjs` | Password hashing and comparison |
| `@types/bcryptjs` | TypeScript types (dev) |

### Internal Dependencies

| Module | Purpose |
|--------|---------|
| Cloudflare D1 (`DB` binding) | User persistence |
| `@opennextjs/cloudflare` | Runtime context and Workers deployment |
| shadcn/ui components | Form and layout UI |

### Infrastructure

| Item | Notes |
|------|-------|
| D1 database | Create via `npx wrangler d1 create quiz-app-db` (exact name TBD at implementation) |
| Local migrations | `--local` only; remote apply is user decision |

### Environment Variables

None required for Sprint 1. No auth secrets or third-party API keys.

---

## Risks and Mitigation

### Technical Risks

- **Risk:** Login/logout without sessions means no persistent auth state after page refresh.
- **Mitigation:** Documented as intentional Sprint 1 scope. Sprint 2+ should add session or token auth before MCQ collaboration features.

- **Risk:** Unauthenticated user CRUD endpoints could be abused.
- **Mitigation:** Explicitly out of scope for authorization in Sprint 1; add middleware and roles before production use.

- **Risk:** D1 behaves differently in Node dev vs Workers preview.
- **Mitigation:** Verify auth flows with `npm run preview`; follow `d1.mdc` query patterns.

- **Risk:** bcrypt performance on Workers cold starts.
- **Mitigation:** Use cost factor 10; acceptable for low-traffic teacher registration.

### User Experience Risks

- **Risk:** User registers, refreshes `/mcqs`, and appears "logged out" with no session.
- **Mitigation:** Stub page copy can note that full session support is coming; redirect flow works within the same browser session.

- **Risk:** `/mcqs` is reachable without logging in.
- **Mitigation:** Accept for Sprint 1; route guards deferred until session management is in scope.

---

## Deployment and Verification (Phase 1)

Use this section to verify what shipped in the Phase 1 deploy. **No user-facing auth UI or API routes exist yet** — those are Phase 2 and Phase 3.

### What was deployed

| Item | Detail |
|------|--------|
| D1 database | `quiz-app-db` (binding: `DB`) |
| Database ID | `2e9b4234-3d1a-4f5f-af3b-53e0f273a6e8` |
| Schema | `users` table via `migrations/0001_create_users.sql` |
| Dependencies | `zod`, `bcryptjs`, `@types/bcryptjs` |
| Library code | `src/lib/auth/password.ts`, `src/lib/validation/user-schemas.ts`, `src/lib/services/user-service.ts` |

### Remote database migration

Production D1 must have the schema applied before auth APIs work (Phase 2):

```bash
npx wrangler d1 migrations apply quiz-app-db --remote
```

Local-only verification uses:

```bash
npx wrangler d1 migrations apply quiz-app-db --local
```

### How to verify (developers / testers)

**Build health (no Cloudflare auth required):**

```bash
npm run lint
npm run build
```

**Workers runtime + D1 (requires local Wrangler / Cloudflare setup):**

```bash
npm run preview
```

**Inspect local D1 data:**

```bash
npx wrangler d1 execute quiz-app-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Expected output includes a `users` table.

### Not yet available for testing

- `POST /api/auth/register`, `/login`, `/logout` — Phase 2
- `GET/POST/PATCH/DELETE /api/users` — Phase 2
- `/register`, `/login`, `/mcqs` pages — Phase 3
- End-to-end register → login → logout flow — Phase 3

### Phase 1 acceptance criteria status

- [ ] *(Deferred to Phase 2/3)* User registration, login, logout flows
- [x] Password hashing helpers implemented (`bcryptjs`, cost factor 10)
- [x] User service layer with CRUD queries against D1
- [x] Zod validation schemas defined
- [x] `users` migration created and applied locally
- [x] `npm run lint` passes
- [x] `npm run build` passes

---

## Troubleshooting Guide

_No entries yet — add problems and solutions as they arise during implementation._

---

## Notes for AI Agents

When working with this PRD:

1. Read Overview and Hypothesis first — this is a teacher collaboration platform; Sprint 1 is identity only.
2. Do **not** build MCQ features, social login, JWT/tokens, or session cookies.
3. Use D1 with migrations; never alter schema with ad-hoc SQL.
4. Centralize DB access in `src/lib/services/`; use numbered placeholders in queries.
5. Propose `zod` and `bcryptjs` to the user before adding them.
6. Verify with `npm run lint`, `npm run build`, and `npm run preview` before marking complete.
7. Update phase status markers and acceptance criteria checkboxes as work progresses.
8. Do not deploy or apply remote D1 migrations unless explicitly asked.

---

## Current Status

**Last Updated:** 2026-08-26
**Current Phase:** Phase 2 — API Routes
**Status:** IN PROGRESS (Phase 1 complete and deployed)
**Next Steps:** Implement auth and user CRUD API route handlers (Phase 2), then frontend pages (Phase 3)
