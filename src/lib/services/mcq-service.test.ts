import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	createQuestion,
	deleteQuestion,
	getQuestionById,
	getQuestionForPreview,
	listQuestions,
	recordAttempt,
	toChoice,
	toQuestionSummary,
	updateQuestion,
} from "@/lib/services/mcq-service";

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from "@opennextjs/cloudflare";

const mockBatch = vi.fn();
const mockAll = vi.fn();
const mockRun = vi.fn();
const mockBind = vi.fn(() => ({ all: mockAll, run: mockRun }));
const mockPrepare = vi.fn(() => ({ bind: mockBind, all: mockAll, run: mockRun }));
const mockDb = { prepare: mockPrepare, batch: mockBatch };

const questionRow = {
	id: "q1",
	name: "Chapter 5 Review",
	question_text: "What is the capital of France?",
	created_by: null,
	created_at: "2026-09-03T10:00:00.000Z",
	updated_at: "2026-09-03T10:00:00.000Z",
};

const choiceRows = [
	{
		id: "c1",
		question_id: "q1",
		choice_text: "Paris",
		is_correct: 1,
		sort_order: 0,
	},
	{
		id: "c2",
		question_id: "q1",
		choice_text: "London",
		is_correct: 0,
		sort_order: 1,
	},
];

const createInput = {
	name: "Chapter 5 Review",
	questionText: "What is the capital of France?",
	choices: [
		{ choiceText: "Paris", isCorrect: true },
		{ choiceText: "London", isCorrect: false },
	],
};

beforeEach(() => {
	vi.clearAllMocks();
	mockAll.mockReset();
	mockBatch.mockReset();
	mockBind.mockReset();
	mockPrepare.mockReset();
	mockRun.mockReset();
	mockBatch.mockResolvedValue([]);
	vi.mocked(getCloudflareContext).mockResolvedValue({ env: { DB: mockDb } } as never);
});

describe("toQuestionSummary", () => {
	it("maps snake_case database columns to camelCase API fields", () => {
		expect(toQuestionSummary(questionRow)).toEqual({
			id: "q1",
			name: "Chapter 5 Review",
			questionText: "What is the capital of France?",
			createdBy: null,
			createdAt: "2026-09-03T10:00:00.000Z",
			updatedAt: "2026-09-03T10:00:00.000Z",
		});
	});
});

describe("toChoice", () => {
	it("maps choice row to API shape", () => {
		expect(toChoice(choiceRows[0])).toEqual({
			id: "c1",
			choiceText: "Paris",
			isCorrect: true,
			sortOrder: 0,
		});
	});
});

describe("createQuestion", () => {
	it("inserts question and choices with created_by null", async () => {
		mockAll.mockResolvedValueOnce({ results: [questionRow] }).mockResolvedValueOnce({ results: choiceRows });

		const question = await createQuestion(createInput);

		expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO mcq_questions"));
		expect(mockBind).toHaveBeenCalledWith("Chapter 5 Review", "What is the capital of France?");
		expect(mockBatch).toHaveBeenCalled();
		expect(question.id).toBe("q1");
		expect(question.choices).toHaveLength(2);
		expect(question.choices[0]?.isCorrect).toBe(true);
		expect(question.createdBy).toBeNull();
	});
});

describe("listQuestions", () => {
	it("returns all question summaries ordered newest first", async () => {
		mockAll.mockResolvedValue({ results: [questionRow] });

		const result = await listQuestions();

		expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("ORDER BY created_at DESC"));
		expect(result).toEqual([toQuestionSummary(questionRow)]);
	});
});

describe("getQuestionById", () => {
	it("returns full question with choices", async () => {
		mockAll.mockResolvedValueOnce({ results: [questionRow] }).mockResolvedValueOnce({ results: choiceRows });

		const question = await getQuestionById("q1");

		expect(question?.choices[0]?.isCorrect).toBe(true);
		expect(question?.choices[1]?.isCorrect).toBe(false);
	});

	it("returns null when question is not found", async () => {
		mockAll.mockResolvedValue({ results: [] });
		expect(await getQuestionById("missing")).toBeNull();
	});
});

describe("getQuestionForPreview", () => {
	it("returns choices without isCorrect", async () => {
		mockAll.mockResolvedValueOnce({ results: [questionRow] }).mockResolvedValueOnce({ results: choiceRows });

		const question = await getQuestionForPreview("q1");

		expect(question?.choices).toEqual([
			{ id: "c1", choiceText: "Paris", sortOrder: 0 },
			{ id: "c2", choiceText: "London", sortOrder: 1 },
		]);
		expect(question?.choices[0]).not.toHaveProperty("isCorrect");
	});

	it("returns null when question is not found", async () => {
		mockAll.mockResolvedValue({ results: [] });
		expect(await getQuestionForPreview("missing")).toBeNull();
	});
});

describe("updateQuestion", () => {
	it("replaces choices and updates question fields", async () => {
		const updatedRow = { ...questionRow, name: "Updated Name" };
		const updatedChoices = [
			{ ...choiceRows[0], choice_text: "Paris", is_correct: 1 },
			{ ...choiceRows[1], choice_text: "Berlin", is_correct: 0 },
		];

		mockAll
			.mockResolvedValueOnce({ results: [questionRow] })
			.mockResolvedValueOnce({ results: [updatedRow] })
			.mockResolvedValueOnce({ results: updatedChoices });

		const question = await updateQuestion("q1", {
			...createInput,
			name: "Updated Name",
			choices: [
				{ choiceText: "Paris", isCorrect: true },
				{ choiceText: "Berlin", isCorrect: false },
			],
		});

		expect(mockBatch).toHaveBeenCalled();
		const batchStatements = mockBatch.mock.calls[0]?.[0] as Array<{ bind: ReturnType<typeof vi.fn> }>;
		expect(batchStatements[0]).toBeDefined();
		expect(mockPrepare).toHaveBeenCalledWith("DELETE FROM mcq_attempts WHERE question_id = ?1");
		expect(mockPrepare).toHaveBeenCalledWith("DELETE FROM mcq_choices WHERE question_id = ?1");
		expect(question?.name).toBe("Updated Name");
		expect(question?.choices[1]?.choiceText).toBe("Berlin");
	});

	it("returns null when question does not exist", async () => {
		mockAll.mockResolvedValue({ results: [] });
		expect(await updateQuestion("missing", createInput)).toBeNull();
	});
});

describe("deleteQuestion", () => {
	it("returns true when a row is deleted", async () => {
		mockRun.mockResolvedValue({ meta: { changes: 1 } });
		expect(await deleteQuestion("q1")).toBe(true);
	});

	it("returns false when no row is deleted", async () => {
		mockRun.mockResolvedValue({ meta: { changes: 0 } });
		expect(await deleteQuestion("missing")).toBe(false);
	});
});

describe("recordAttempt", () => {
	it("records attempt using server-side correctness from stored choice", async () => {
		mockAll
			.mockResolvedValueOnce({ results: [questionRow] })
			.mockResolvedValueOnce({ results: [choiceRows[0]] })
			.mockResolvedValueOnce({ results: [] });

		const result = await recordAttempt("q1", "c1", 1);

		expect(result).toEqual({
			ok: true,
			isCorrect: true,
			attemptNumber: 1,
			attemptsRemaining: 2,
			isExhausted: true,
		});
		expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO mcq_attempts"));
		expect(mockBind).toHaveBeenLastCalledWith("q1", "c1", 1);
	});

	it("returns retry metadata for an incorrect choice with attempts remaining", async () => {
		mockAll
			.mockResolvedValueOnce({ results: [questionRow] })
			.mockResolvedValueOnce({ results: [choiceRows[1]] })
			.mockResolvedValueOnce({ results: [] });

		const result = await recordAttempt("q1", "c2", 1);

		expect(result).toEqual({
			ok: true,
			isCorrect: false,
			attemptNumber: 1,
			attemptsRemaining: 2,
			isExhausted: false,
		});
		expect(mockBind).toHaveBeenLastCalledWith("q1", "c2", 0);
	});

	it("reveals the correct choice on the final failed attempt", async () => {
		mockAll
			.mockResolvedValueOnce({ results: [questionRow] })
			.mockResolvedValueOnce({ results: [choiceRows[1]] })
			.mockResolvedValueOnce({ results: [] })
			.mockResolvedValueOnce({ results: [choiceRows[0]] });

		const result = await recordAttempt("q1", "c2", 3);

		expect(result).toEqual({
			ok: true,
			isCorrect: false,
			attemptNumber: 3,
			attemptsRemaining: 0,
			isExhausted: true,
			correctChoice: { id: "c1", choiceText: "Paris" },
		});
	});

	it("returns QUESTION_NOT_FOUND when question is missing", async () => {
		mockAll.mockResolvedValue({ results: [] });
		expect(await recordAttempt("missing", "c1", 1)).toEqual({ ok: false, code: "QUESTION_NOT_FOUND" });
	});

	it("returns INVALID_CHOICE when choice does not belong to question", async () => {
		mockAll.mockResolvedValueOnce({ results: [questionRow] }).mockResolvedValueOnce({ results: [] });
		expect(await recordAttempt("q1", "bad-choice", 1)).toEqual({ ok: false, code: "INVALID_CHOICE" });
	});
});
