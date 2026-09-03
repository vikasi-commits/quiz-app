import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const phase1Files = [
	"migrations/0002_create_mcq_tables.sql",
	"src/lib/verification/sprint2-phase1-migration.test.ts",
];

const phase2Files = [
	"src/lib/validation/mcq-schemas.ts",
	"src/lib/validation/mcq-schemas.test.ts",
	"src/lib/services/mcq-service.ts",
	"src/lib/services/mcq-service.test.ts",
	"src/lib/api/mcqs.ts",
	"src/lib/api/mcqs.test.ts",
];

const phase3Files = [
	"src/app/api/mcqs/route.ts",
	"src/app/api/mcqs/[id]/route.ts",
	"src/app/api/mcqs/[id]/preview/route.ts",
	"src/app/api/mcqs/[id]/attempts/route.ts",
	"src/app/api/mcqs/mcq-routes.test.ts",
];

const phase4Files = [
	"src/app/mcqs/page.tsx",
	"src/app/mcqs/new/page.tsx",
	"src/app/mcqs/[id]/edit/page.tsx",
	"src/app/mcqs/[id]/preview/page.tsx",
	"src/components/mcq/mcq-question-form.tsx",
	"src/components/mcq/mcq-question-form.test.tsx",
	"src/components/mcq/mcq-list.tsx",
	"src/components/mcq/mcq-list.test.tsx",
	"src/components/mcq/mcq-list-table.tsx",
	"src/components/mcq/mcq-preview.tsx",
	"src/components/mcq/mcq-preview.test.tsx",
	"src/components/mcq/mcq-question-page.tsx",
	"src/components/ui/textarea.tsx",
	"src/components/ui/dropdown-menu.tsx",
	"src/components/ui/alert-dialog.tsx",
	"src/components/ui/radio-group.tsx",
];

const phase5Files = ["ai-workspace/sprint-2-mcq-management_PRD.md", "AGENTS.md"];

const removedStubFiles = ["src/components/auth/mcq-stub.tsx", "src/components/auth/mcq-stub.test.tsx"];

describe("Phase 5: Sprint 2 verification checklist", () => {
	it.each(phase1Files)("Phase 1 deliverable exists: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(true);
	});

	it.each(phase2Files)("Phase 2 deliverable exists: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(true);
	});

	it.each(phase3Files)("Phase 3 deliverable exists: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(true);
	});

	it.each(phase4Files)("Phase 4 deliverable exists: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(true);
	});

	it.each(phase5Files)("Phase 5 deliverable exists: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(true);
	});

	it.each(removedStubFiles)("MCQ stub removed: %s", (file) => {
		expect(existsSync(resolve(root, file))).toBe(false);
	});

	it("documents automated test command in package.json", async () => {
		const pkg = await import("../../../package.json");
		expect(pkg.default.scripts.test).toBe("vitest run");
		expect(pkg.default.scripts.lint).toBe("eslint .");
		expect(pkg.default.scripts.build).toBe("next build");
	});
});
