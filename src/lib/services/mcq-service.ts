import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { CreateMcqInput } from "@/lib/validation/mcq-schemas";

export type McqQuestionRow = {
	id: string;
	name: string;
	question_text: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

export type McqChoiceRow = {
	id: string;
	question_id: string;
	choice_text: string;
	is_correct: number;
	sort_order: number;
};

export type McqQuestionSummary = {
	id: string;
	name: string;
	questionText: string;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
};

export type McqChoice = {
	id: string;
	choiceText: string;
	isCorrect: boolean;
	sortOrder: number;
};

export type McqPreviewChoice = {
	id: string;
	choiceText: string;
	sortOrder: number;
};

export type McqQuestion = McqQuestionSummary & {
	choices: McqChoice[];
};

export type McqPreviewQuestion = {
	id: string;
	name: string;
	questionText: string;
	choices: McqPreviewChoice[];
};

export type RecordAttemptResult =
	| { ok: true; isCorrect: boolean }
	| { ok: false; code: "QUESTION_NOT_FOUND" | "INVALID_CHOICE" };

const QUESTION_COLUMNS = "id, name, question_text, created_by, created_at, updated_at";
const CHOICE_COLUMNS = "id, question_id, choice_text, is_correct, sort_order";

async function getDb() {
	const { env } = await getCloudflareContext();
	return env.DB;
}

export function toQuestionSummary(row: McqQuestionRow): McqQuestionSummary {
	return {
		id: row.id,
		name: row.name,
		questionText: row.question_text,
		createdBy: row.created_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function toChoice(row: McqChoiceRow): McqChoice {
	return {
		id: row.id,
		choiceText: row.choice_text,
		isCorrect: row.is_correct === 1,
		sortOrder: row.sort_order,
	};
}

function toPreviewChoice(row: McqChoiceRow): McqPreviewChoice {
	return {
		id: row.id,
		choiceText: row.choice_text,
		sortOrder: row.sort_order,
	};
}

function toFullQuestion(row: McqQuestionRow, choices: McqChoiceRow[]): McqQuestion {
	return {
		...toQuestionSummary(row),
		choices: choices.map(toChoice),
	};
}

async function findQuestionRowById(id: string): Promise<McqQuestionRow | null> {
	const db = await getDb();
	const result = await db
		.prepare(`SELECT ${QUESTION_COLUMNS} FROM mcq_questions WHERE id = ?1`)
		.bind(id)
		.all<McqQuestionRow>();

	return result.results[0] ?? null;
}

async function findChoicesByQuestionId(questionId: string): Promise<McqChoiceRow[]> {
	const db = await getDb();
	const result = await db
		.prepare(
			`SELECT ${CHOICE_COLUMNS}
       FROM mcq_choices
       WHERE question_id = ?1
       ORDER BY sort_order ASC`,
		)
		.bind(questionId)
		.all<McqChoiceRow>();

	return result.results;
}

async function insertChoices(
	db: D1Database,
	questionId: string,
	choices: CreateMcqInput["choices"],
): Promise<McqChoiceRow[]> {
	const statements = choices.map((choice, index) =>
		db
			.prepare(
				`INSERT INTO mcq_choices (question_id, choice_text, is_correct, sort_order)
         VALUES (?1, ?2, ?3, ?4)`,
			)
			.bind(questionId, choice.choiceText, choice.isCorrect ? 1 : 0, index),
	);

	await db.batch(statements);
	return findChoicesByQuestionId(questionId);
}

export async function createQuestion(input: CreateMcqInput): Promise<McqQuestion> {
	const db = await getDb();

	const result = await db
		.prepare(
			`INSERT INTO mcq_questions (name, question_text, created_by)
       VALUES (?1, ?2, NULL)
       RETURNING ${QUESTION_COLUMNS}`,
		)
		.bind(input.name, input.questionText)
		.all<McqQuestionRow>();

	const question = result.results[0];
	if (!question) {
		throw new Error("Failed to create question");
	}

	const choices = await insertChoices(db, question.id, input.choices);
	return toFullQuestion(question, choices);
}

export async function listQuestions(): Promise<McqQuestionSummary[]> {
	const db = await getDb();
	const result = await db
		.prepare(
			`SELECT ${QUESTION_COLUMNS}
       FROM mcq_questions
       ORDER BY created_at DESC`,
		)
		.all<McqQuestionRow>();

	return result.results.map(toQuestionSummary);
}

export async function getQuestionById(id: string): Promise<McqQuestion | null> {
	const question = await findQuestionRowById(id);
	if (!question) {
		return null;
	}

	const choices = await findChoicesByQuestionId(id);
	return toFullQuestion(question, choices);
}

export async function getQuestionForPreview(id: string): Promise<McqPreviewQuestion | null> {
	const question = await findQuestionRowById(id);
	if (!question) {
		return null;
	}

	const choices = await findChoicesByQuestionId(id);
	return {
		id: question.id,
		name: question.name,
		questionText: question.question_text,
		choices: choices.map(toPreviewChoice),
	};
}

export async function updateQuestion(id: string, input: CreateMcqInput): Promise<McqQuestion | null> {
	const existing = await findQuestionRowById(id);
	if (!existing) {
		return null;
	}

	const db = await getDb();

	await db.batch([
		db.prepare("DELETE FROM mcq_attempts WHERE question_id = ?1").bind(id),
		db.prepare("DELETE FROM mcq_choices WHERE question_id = ?1").bind(id),
		db
			.prepare(
				`UPDATE mcq_questions
         SET name = ?1, question_text = ?2, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?3`,
			)
			.bind(input.name, input.questionText, id),
	]);

	const updatedQuestion = await findQuestionRowById(id);
	if (!updatedQuestion) {
		return null;
	}

	const choices = await insertChoices(db, id, input.choices);
	return toFullQuestion(updatedQuestion, choices);
}

export async function deleteQuestion(id: string): Promise<boolean> {
	const db = await getDb();
	const result = await db.prepare("DELETE FROM mcq_questions WHERE id = ?1").bind(id).run();
	return (result.meta.changes ?? 0) > 0;
}

export async function recordAttempt(
	questionId: string,
	selectedChoiceId: string,
): Promise<RecordAttemptResult> {
	const question = await findQuestionRowById(questionId);
	if (!question) {
		return { ok: false, code: "QUESTION_NOT_FOUND" };
	}

	const db = await getDb();
	const choiceResult = await db
		.prepare(
			`SELECT ${CHOICE_COLUMNS}
       FROM mcq_choices
       WHERE id = ?1 AND question_id = ?2`,
		)
		.bind(selectedChoiceId, questionId)
		.all<McqChoiceRow>();

	const choice = choiceResult.results[0];
	if (!choice) {
		return { ok: false, code: "INVALID_CHOICE" };
	}

	const isCorrect = choice.is_correct === 1;

	await db
		.prepare(
			`INSERT INTO mcq_attempts (question_id, user_id, selected_choice_id, is_correct)
       VALUES (?1, NULL, ?2, ?3)`,
		)
		.bind(questionId, selectedChoiceId, isCorrect ? 1 : 0)
		.all();

	return { ok: true, isCorrect };
}
