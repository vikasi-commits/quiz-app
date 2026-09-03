import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = "migrations/0002_create_mcq_tables.sql";

function readMigration(): string {
	const fullPath = resolve(root, migrationPath);
	expect(existsSync(fullPath)).toBe(true);
	return readFileSync(fullPath, "utf-8");
}

function expectSqlContains(sql: string, fragment: string): void {
	expect(sql.toLowerCase()).toContain(fragment.toLowerCase());
}

describe("Phase 1: Sprint 2 MCQ migration", () => {
	it("migration file exists at migrations/0002_create_mcq_tables.sql", () => {
		expect(existsSync(resolve(root, migrationPath))).toBe(true);
	});

	it("creates mcq_questions table with required columns", () => {
		const sql = readMigration();

		expectSqlContains(sql, "CREATE TABLE mcq_questions");
		expectSqlContains(sql, "id TEXT PRIMARY KEY");
		expectSqlContains(sql, "name TEXT NOT NULL");
		expectSqlContains(sql, "question_text TEXT NOT NULL");
		expectSqlContains(sql, "created_by TEXT REFERENCES users(id)");
		expectSqlContains(sql, "created_at DATETIME");
		expectSqlContains(sql, "updated_at DATETIME");
	});

	it("creates mcq_choices table with cascade delete on question", () => {
		const sql = readMigration();

		expectSqlContains(sql, "CREATE TABLE mcq_choices");
		expectSqlContains(sql, "question_id TEXT NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE");
		expectSqlContains(sql, "choice_text TEXT NOT NULL");
		expectSqlContains(sql, "is_correct INTEGER NOT NULL");
		expectSqlContains(sql, "sort_order INTEGER NOT NULL");
	});

	it("creates mcq_attempts table with nullable user reference", () => {
		const sql = readMigration();

		expectSqlContains(sql, "CREATE TABLE mcq_attempts");
		expectSqlContains(sql, "question_id TEXT NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE");
		expectSqlContains(sql, "user_id TEXT REFERENCES users(id)");
		expectSqlContains(sql, "selected_choice_id TEXT NOT NULL REFERENCES mcq_choices(id)");
		expectSqlContains(sql, "is_correct INTEGER NOT NULL");
		expectSqlContains(sql, "attempted_at DATETIME");
	});

	it("creates indexes on foreign key columns", () => {
		const sql = readMigration();

		expectSqlContains(sql, "CREATE INDEX idx_mcq_choices_question_id ON mcq_choices(question_id)");
		expectSqlContains(sql, "CREATE INDEX idx_mcq_attempts_question_id ON mcq_attempts(question_id)");
	});
});
