import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const phase1And2Files = [
	"migrations/0001_create_users.sql",
	"src/lib/auth/password.ts",
	"src/lib/validation/user-schemas.ts",
	"src/lib/services/user-service.ts",
	"src/app/api/auth/register/route.ts",
	"src/app/api/auth/login/route.ts",
	"src/app/api/auth/logout/route.ts",
	"src/app/api/users/route.ts",
	"src/app/api/users/[id]/route.ts",
];

const phase3Files = [
	"src/app/register/page.tsx",
	"src/app/login/page.tsx",
	"src/app/mcqs/page.tsx",
	"src/components/auth/register-form.tsx",
	"src/components/auth/login-form.tsx",
	"src/components/mcq/mcq-list.tsx",
	"src/components/home/landing-hero.tsx",
];

describe("Phase 4: Sprint 1 verification checklist", () => {
	it.each(phase1And2Files)("Phase 1/2 deliverable exists: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(true);
	});

	it.each(phase3Files)("Phase 3 deliverable exists: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(true);
	});

	it("documents automated test command in package.json", async () => {
		const pkg = await import("../../../package.json");
		expect(pkg.default.scripts.test).toBe("vitest run");
	});
});
