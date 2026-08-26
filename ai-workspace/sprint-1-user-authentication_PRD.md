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

**Production URL:** https://quiz-app.vikas-i.workers.dev

---

### Phase 2: API Routes - COMPLETED

**Objective:** Implement all auth and user CRUD endpoints.

**Tasks:**

1. ✅ `POST /api/auth/register`
2. ✅ `POST /api/auth/login`
3. ✅ `POST /api/auth/logout`
4. ✅ `POST /api/users`
5. ✅ `GET /api/users`
6. ✅ `GET /api/users/[id]`
7. ✅ `PATCH /api/users/[id]`
8. ✅ `DELETE /api/users/[id]`
9. ✅ Map DB snake_case columns to camelCase in JSON responses
10. ✅ Consistent error handling across routes

**Deliverables:**

- Route handlers under `src/app/api/`
- Shared helpers in `src/lib/api/users.ts`
- No password or hash leakage in any response

**Deployed:** 2026-08-26 — auth and user CRUD API routes live in production.

**Production URL:** https://quiz-app.vikas-i.workers.dev

### Phase 3: Frontend Pages - COMPLETED

**Objective:** Registration, login, logout, and MCQ stub UI.

**Approach:** TDD — component tests written before implementation.

**Tasks:**

1. ✅ Build `/register` page with form and API integration
2. ✅ Build `/login` page with form and API integration
3. ✅ Build `/mcqs` stub page with logout action
4. ✅ Update `/` landing with navigation to auth pages
5. ✅ Style with shadcn/ui and Tailwind theme tokens
6. ✅ Handle loading and error states on all forms

**Deliverables:**

- `src/app/register/page.tsx`
- `src/app/login/page.tsx`
- `src/app/mcqs/page.tsx`
- Updated `src/app/page.tsx`
- `src/components/auth/register-form.tsx` + tests
- `src/components/auth/login-form.tsx` + tests
- `src/components/auth/mcq-stub.tsx` + tests
- `src/components/home/landing-hero.tsx` + tests
- `src/lib/auth/client-user.ts` + tests

**Deployed:** 2026-08-26 — frontend pages live in production.

**Production URL:** https://quiz-app.vikas-i.workers.dev

---

### Phase 4: Verification - COMPLETED

**Objective:** Confirm the sprint meets acceptance criteria.

**Approach:** TDD — automated verification checklist test before sign-off.

**Tasks:**

1. ✅ Run `npm run lint` — must pass
2. ✅ Run `npm run build` — must pass
3. ⏳ Run `npm run preview` and manually test register, login, logout, and CRUD via API
4. ⏳ Verify passwords are hashed in D1 local database
5. ✅ Update `AGENTS.md` project description to reflect Sprint 1 scope

**Deliverables:**

- Lint, build, and test passing (`npm run test` — 90 tests)
- `src/lib/verification/sprint1-verification.test.ts` — deliverable file checklist
- Manual preview/D1 checks documented below

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

## TDD Assessment

| Phase | TDD used? | Notes |
|-------|-----------|-------|
| Phase 1 | **No** (test-after) | Infrastructure built first; tests added during TDD review (`user-service.test.ts`, extended `password.test.ts`) |
| Phase 2 | **No** (test-after) | API routes built first; 43 route/schema tests added afterward; gaps filled with `users.test.ts` helper coverage |
| Phase 3 | **Yes** | Tests written first in `*.test.tsx`, then components implemented to pass |
| Phase 4 | **Yes** | `sprint1-verification.test.ts` defines deliverable checklist; lint/build/test run to confirm |

### Phase 1/2 coverage gaps filled (no logic changes)

| Added test file | Covers |
|-----------------|--------|
| `src/lib/services/user-service.test.ts` | D1 service layer: CRUD, email lookup, mapping |
| Extended `src/lib/api/users.test.ts` | `apiError`, `validationError`, `parseJsonBody`, `userRowToSafeUser` |

### Phase 3/4 tests added (TDD)

| Test file | Covers |
|-----------|--------|
| `src/lib/auth/client-user.test.ts` | Session storage for user display across pages |
| `src/components/auth/register-form.test.tsx` | UI-01, UI-02 |
| `src/components/auth/login-form.test.tsx` | UI-03, UI-04 |
| `src/components/auth/mcq-stub.test.tsx` | UI-05 |
| `src/components/home/landing-hero.test.tsx` | UI-06 |
| `src/lib/verification/sprint1-verification.test.ts` | Phase 4 deliverable file checklist |

**Current automated coverage:** 90 tests across 12 files.

---

## Test Cases

This matrix maps Sprint 1 acceptance criteria to concrete test cases. **Automated** cases run via `npm run test`. **Manual** cases require `npm run preview` or browser testing (Phase 3 UI).

### Phase 1 — Infrastructure

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| P1-01 | `hashPassword` produces bcrypt hash | Hash starts with `$2`, differs from plain text | Unit | `src/lib/auth/password.test.ts` |
| P1-02 | `verifyPassword` with correct password | Returns `true` | Unit | `src/lib/auth/password.test.ts` |
| P1-03 | `verifyPassword` with wrong password | Returns `false` | Unit | `src/lib/auth/password.test.ts` |
| P1-04 | `users` table exists in local D1 | Query returns `users` table | Manual | `wrangler d1 execute ... --local` |
| P1-05 | Password stored as hash in D1 (not plain text) | `password_hash` column is bcrypt format | Manual | Inspect D1 after register |

### Phase 2 — Validation schemas

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| V-01 | Register with valid fields + lastName | Parse succeeds; email lowercased | Unit | `user-schemas.test.ts` |
| V-02 | Register without lastName | Parse succeeds | Unit | `user-schemas.test.ts` |
| V-03 | Register with empty lastName | Parse succeeds | Unit | `user-schemas.test.ts` |
| V-04 | Register without firstName | Parse fails | Unit | `user-schemas.test.ts` |
| V-05 | Register with invalid email | Parse fails | Unit | `user-schemas.test.ts` |
| V-06 | Register with password &lt; 8 chars | Parse fails | Unit | `user-schemas.test.ts` |
| V-07 | Login with valid email/password | Parse succeeds; email lowercased | Unit | `user-schemas.test.ts` |
| V-08 | Login with invalid email | Parse fails | Unit | `user-schemas.test.ts` |
| V-09 | Login with empty password | Parse fails | Unit | `user-schemas.test.ts` |
| V-10 | Update with at least one field | Parse succeeds | Unit | `user-schemas.test.ts` |
| V-11 | Update with empty object | Parse fails | Unit | `user-schemas.test.ts` |
| V-12 | Update password &lt; 8 chars | Parse fails | Unit | `user-schemas.test.ts` |
| V-13 | List users default pagination | `limit=50`, `offset=0` | Unit | `user-schemas.test.ts` |
| V-14 | List users invalid limit (&gt;100) | Parse fails | Unit | `user-schemas.test.ts` |
| V-15 | List users negative offset | Parse fails | Unit | `user-schemas.test.ts` |

### Phase 2 — Auth API

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| A-01 | `POST /api/auth/register` valid payload | `201`, `{ user }` without password fields | Unit | `auth-routes.test.ts` |
| A-02 | `POST /api/auth/register` duplicate email | `409`, `EMAIL_TAKEN` | Unit | `auth-routes.test.ts` |
| A-03 | `POST /api/auth/register` invalid email | `400`, `VALIDATION_ERROR` | Unit | `auth-routes.test.ts` |
| A-04 | `POST /api/auth/register` invalid JSON | `400`, `INVALID_JSON` | Unit | `auth-routes.test.ts` |
| A-05 | `POST /api/auth/login` valid credentials | `200`, safe user object | Unit | `auth-routes.test.ts` |
| A-06 | `POST /api/auth/login` unknown email | `401`, generic error, `INVALID_CREDENTIALS` | Unit | `auth-routes.test.ts` |
| A-07 | `POST /api/auth/login` wrong password | `401`, same message as unknown email | Unit | `auth-routes.test.ts` |
| A-08 | `POST /api/auth/login` invalid email format | `400` | Unit | `auth-routes.test.ts` |
| A-09 | `POST /api/auth/logout` | `200`, `{ success: true }` | Unit | `auth-routes.test.ts` |
| A-10 | Register → login E2E via preview | User created, login returns same email | Manual | curl against preview URL |
| A-11 | Response never contains password or hash | No `password`, `password_hash` in JSON | Unit + Manual | `auth-routes.test.ts` + inspect responses |

### Phase 2 — User CRUD API

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| U-01 | `POST /api/users` valid payload | `201`, user created | Unit | `users-routes.test.ts` |
| U-02 | `POST /api/users` duplicate email | `409`, `EMAIL_TAKEN` | Unit | `users-routes.test.ts` |
| U-03 | `GET /api/users` default list | `200`, `{ users, total }` | Unit | `users-routes.test.ts` |
| U-04 | `GET /api/users?limit=500` | `400`, validation error | Unit | `users-routes.test.ts` |
| U-05 | `GET /api/users/[id]` existing user | `200`, `{ user }` | Unit | `users-routes.test.ts` |
| U-06 | `GET /api/users/[id]` missing user | `404`, `USER_NOT_FOUND` | Unit | `users-routes.test.ts` |
| U-07 | `PATCH /api/users/[id]` update firstName | `200`, updated user | Unit | `users-routes.test.ts` |
| U-08 | `PATCH /api/users/[id]` missing user | `404` | Unit | `users-routes.test.ts` |
| U-09 | `PATCH /api/users/[id]` email taken | `409`, `EMAIL_TAKEN` | Unit | `users-routes.test.ts` |
| U-10 | `PATCH /api/users/[id]` empty body | `400` | Unit | `users-routes.test.ts` |
| U-11 | `DELETE /api/users/[id]` existing user | `200`, `{ success: true }` | Unit | `users-routes.test.ts` |
| U-12 | `DELETE /api/users/[id]` missing user | `404` | Unit | `users-routes.test.ts` |
| U-13 | Full CRUD lifecycle via preview | Create → read → update → delete | Manual | curl / Postman against preview |

### Phase 2 — Shared user creation logic

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| S-01 | `createUserFromRegisterInput` email taken | `{ ok: false, code: EMAIL_TAKEN }` | Unit | `users.test.ts` |
| S-02 | `createUserFromRegisterInput` success | Hashes password, calls `createUser` | Unit | `users.test.ts` |

### Phase 3 — UI (not yet implemented)

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| UI-01 | Register form submits valid data | Redirect to `/mcqs` | Unit | `register-form.test.tsx` |
| UI-02 | Register form shows validation errors | Inline error messages | Unit | `register-form.test.tsx` |
| UI-03 | Login form valid credentials | Redirect to `/mcqs` | Unit | `login-form.test.tsx` |
| UI-04 | Login form invalid credentials | Shows "Invalid email or password" | Unit | `login-form.test.tsx` |
| UI-05 | MCQ stub shows placeholder + logout | Logout redirects to `/login` | Unit | `mcq-stub.test.tsx` |
| UI-06 | Landing page links to login/register | Navigation works | Unit | `landing-hero.test.tsx` |

### Running automated tests

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

**Current automated coverage:** 90 tests across 12 files (Phases 1–4). Manual preview/E2E still recommended before production sign-off.

---

### Phase 1 — Infrastructure (added during TDD review)

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| P1-06 | `toSafeUser` maps DB columns | camelCase API fields | Unit | `user-service.test.ts` |
| P1-07 | `createUser` inserts with placeholders | Safe user returned | Unit | `user-service.test.ts` |
| P1-08 | `findUserByEmail` case-insensitive | NOCASE query used | Unit | `user-service.test.ts` |
| P1-09 | `listUsers` pagination | users + total | Unit | `user-service.test.ts` |
| P1-10 | `deleteUser` success/failure | boolean result | Unit | `user-service.test.ts` |

---

### Phase 2 — API helpers (added during TDD review)

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| H-01 | `apiError` format | `{ error, code }` + status | Unit | `users.test.ts` |
| H-02 | `validationError` format | 400 + VALIDATION_ERROR | Unit | `users.test.ts` |
| H-03 | `parseJsonBody` invalid JSON | 400 INVALID_JSON | Unit | `users.test.ts` |
| H-04 | `userRowToSafeUser` strips hash | No password in output | Unit | `users.test.ts` |

---

### Phase 4 — Verification

| ID | Test case | Expected result | Type | Automated test |
|----|-----------|-----------------|------|----------------|
| F-01 | All Phase 1/2 deliverable files exist | Files on disk | Unit | `sprint1-verification.test.ts` |
| F-02 | All Phase 3 deliverable files exist | Files on disk | Unit | `sprint1-verification.test.ts` |
| F-03 | `npm run test` script configured | vitest run | Unit | `sprint1-verification.test.ts` |
| F-04 | Lint passes | No ESLint errors | Manual | `npm run lint` |
| F-05 | Build passes | Next.js build success | Manual | `npm run build` |
| F-06 | Preview smoke test | Register → login → logout | Manual | `npm run preview` |

---

## Acceptance Criteria

- [x] A teacher can register with first name, email, and password; optional last name is supported
- [x] Duplicate email registration returns 409 with a clear error message
- [ ] Passwords are stored as bcrypt hashes in D1; plain-text passwords never appear in the database
- [x] A teacher can log in with correct email and password and receives a safe user object (no password fields)
- [x] Login with wrong email or password returns 401 with a generic "Invalid email or password" message
- [x] After successful registration, the user is redirected to `/mcqs`
- [x] After successful login, the user is redirected to `/mcqs`
- [x] Logout calls `POST /api/auth/logout`, clears client state, and redirects to `/login`
- [x] MCQ stub page displays placeholder content and a logout control; no MCQ CRUD is present
- [x] `GET /api/users`, `GET /api/users/[id]`, `PATCH /api/users/[id]`, and `DELETE /api/users/[id]` work as specified
- [x] `POST /api/users` creates a user with the same rules as register
- [x] All API inputs are validated with Zod; invalid input returns 400
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Automated test suite passes (`npm run test` — 90 tests)
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
| `vitest` | Automated unit and route tests (dev) |
| `vite-tsconfig-paths` | `@/` alias resolution in tests (dev) |
| `@testing-library/react` | Component tests (dev) |
| `@testing-library/user-event` | User interaction simulation (dev) |
| `@testing-library/jest-dom` | DOM matchers in tests (dev) |
| `jsdom` | Browser-like test environment (dev) |
| `@vitejs/plugin-react` | JSX support in Vitest (dev) |

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

## Deployment and Verification (Phase 3 & 4 — Sprint 1 Complete)

**Deployed:** 2026-08-26  
**Production URL:** https://quiz-app.vikas-i.workers.dev

Sprint 1 is feature-complete. Teachers can register, log in, and reach the MCQ stub page in the browser.

### What was deployed

| Item | Detail |
|------|--------|
| Landing page | `/` — links to login and register |
| Registration | `/register` — form → `POST /api/auth/register` → redirect `/mcqs` |
| Login | `/login` — form → `POST /api/auth/login` → redirect `/mcqs` |
| MCQ stub | `/mcqs` — placeholder + logout → `/login` |
| Client user state | `sessionStorage` via `src/lib/auth/client-user.ts` |
| Automated tests | **90 Vitest tests** across 12 files |
| TDD | Phase 3/4 built test-first; Phase 1/2 retrofitted with gap tests |

### Browser verification (testers)

1. Open https://quiz-app.vikas-i.workers.dev
2. Click **Register** → fill form → submit → should land on `/mcqs`
3. Click **Log out** → should return to `/login`
4. **Log in** with same credentials → should land on `/mcqs` with welcome message
5. Confirm no MCQ creation UI exists (stub only)

### Automated verification (developers)

```bash
npm run lint    # ESLint
npm run test    # 90 Vitest tests
npm run build   # Production build
npm run preview # Full Workers + D1 smoke test (local)
```

### Phase 3/4 acceptance criteria status

- [x] Registration, login, logout UI flows implemented
- [x] Redirect to `/mcqs` after register/login
- [x] MCQ stub with logout control
- [x] Landing page navigation
- [x] 90 automated tests pass
- [x] TDD assessment documented in PRD
- [ ] Manual `npm run preview` smoke test (optional local check)
- [ ] D1 password-hash inspection (optional local check)

---

## Deployment and Verification (Phase 2)

**Deployed:** 2026-08-26  
**Production URL:** https://quiz-app.vikas-i.workers.dev

All auth and user CRUD API routes are live. Test locally with `npm run preview` (port 8787) or against production using the curl examples below.

### What was deployed

| Item | Detail |
|------|--------|
| Auth routes | `POST /api/auth/register`, `/login`, `/logout` |
| User CRUD routes | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/[id]` |
| Shared API helpers | `src/lib/api/users.ts` |
| Automated tests | 43 Vitest tests — run with `npm run test` |
| Test dependencies | `vitest`, `vite-tsconfig-paths` |

### API endpoints available

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Verify credentials |
| POST | `/api/auth/logout` | Acknowledge logout |
| POST | `/api/users` | Create user (CRUD) |
| GET | `/api/users` | List users (`?limit=&offset=`) |
| GET | `/api/users/[id]` | Get user by ID |
| PATCH | `/api/users/[id]` | Update user |
| DELETE | `/api/users/[id]` | Delete user |

### Example verification (curl)

**Production register:**

```bash
curl -X POST https://quiz-app.vikas-i.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","password":"securePass123"}'
```

**Production login:**

```bash
curl -X POST https://quiz-app.vikas-i.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"securePass123"}'
```

**Production list users:**

```bash
curl https://quiz-app.vikas-i.workers.dev/api/users
```

**Local preview (port 8787):**

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","password":"securePass123"}'
```

### Not yet available for testing

_None — Phase 2 API routes are live. See Phase 3 section for browser UI._

### Phase 2 acceptance criteria status

- [x] All auth and user CRUD API endpoints implemented
- [x] Zod validation on all mutating routes and list query params
- [x] Passwords hashed before storage; never returned in responses
- [x] Duplicate email returns 409 with `EMAIL_TAKEN`
- [x] Invalid login returns 401 with `INVALID_CREDENTIALS`
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Automated test suite passes (`npm run test` — 43 tests)

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

Production D1 schema applied on 2026-08-26 via:

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

- `/register`, `/login`, `/mcqs` pages — Phase 3
- End-to-end browser register → login → logout flow — Phase 3

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
**Current Phase:** Sprint 1 complete
**Status:** DEPLOYED (Phase 3 UI + 90 tests)
**Production URL:** https://quiz-app.vikas-i.workers.dev
**Next Steps:** Sprint 2 MCQ creation features
