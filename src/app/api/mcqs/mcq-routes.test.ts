import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonRequest, readJson } from "@/lib/test/helpers";
import type { McqPreviewQuestion, McqQuestion, McqQuestionSummary } from "@/lib/services/mcq-service";

vi.mock("@/lib/services/mcq-service", () => ({
	createQuestion: vi.fn(),
	listQuestions: vi.fn(),
	getQuestionById: vi.fn(),
	getQuestionForPreview: vi.fn(),
	updateQuestion: vi.fn(),
	deleteQuestion: vi.fn(),
	recordAttempt: vi.fn(),
}));

import {
	createQuestion,
	deleteQuestion,
	getQuestionById,
	getQuestionForPreview,
	listQuestions,
	recordAttempt,
	updateQuestion,
} from "@/lib/services/mcq-service";
import { GET as listMcqsGet, POST as createMcqPost } from "@/app/api/mcqs/route";
import {
	DELETE as deleteMcqById,
	GET as getMcqById,
	PATCH as patchMcqById,
} from "@/app/api/mcqs/[id]/route";
import { GET as getMcqPreview } from "@/app/api/mcqs/[id]/preview/route";
import { POST as recordAttemptPost } from "@/app/api/mcqs/[id]/attempts/route";

const validCreateBody = {
	name: "Chapter 5 Review",
	questionText: "What is the capital of France?",
	choices: [
		{ choiceText: "Paris", isCorrect: true },
		{ choiceText: "London", isCorrect: false },
	],
};

const mockMcqSummary: McqQuestionSummary = {
	id: "q1",
	name: "Chapter 5 Review",
	questionText: "What is the capital of France?",
	createdBy: null,
	createdAt: "2026-09-03T10:00:00.000Z",
	updatedAt: "2026-09-03T10:00:00.000Z",
};

const mockMcqQuestion: McqQuestion = {
	...mockMcqSummary,
	choices: [
		{ id: "c1", choiceText: "Paris", isCorrect: true, sortOrder: 0 },
		{ id: "c2", choiceText: "London", isCorrect: false, sortOrder: 1 },
	],
};

const mockMcqPreview: McqPreviewQuestion = {
	id: "q1",
	name: "Chapter 5 Review",
	questionText: "What is the capital of France?",
	choices: [
		{ id: "c1", choiceText: "Paris", sortOrder: 0 },
		{ id: "c2", choiceText: "London", sortOrder: 1 },
	],
};

describe("GET /api/mcqs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns all questions", async () => {
		vi.mocked(listQuestions).mockResolvedValue([mockMcqSummary]);

		const response = await listMcqsGet(new Request("http://localhost/api/mcqs"));

		expect(response.status).toBe(200);
		const body = await readJson<{ questions: McqQuestionSummary[] }>(response);
		expect(body.questions).toHaveLength(1);
		expect(body.questions[0]?.id).toBe("q1");
	});

	it("returns 500 when service throws", async () => {
		vi.mocked(listQuestions).mockRejectedValue(new Error("db error"));

		const response = await listMcqsGet(new Request("http://localhost/api/mcqs"));

		expect(response.status).toBe(500);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("INTERNAL_ERROR");
	});
});

describe("POST /api/mcqs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 201 when question is created", async () => {
		vi.mocked(createQuestion).mockResolvedValue(mockMcqQuestion);

		const response = await createMcqPost(jsonRequest(validCreateBody));

		expect(response.status).toBe(201);
		const body = await readJson<{ question: McqQuestion }>(response);
		expect(body.question.id).toBe("q1");
		expect(createQuestion).toHaveBeenCalledWith(validCreateBody);
	});

	it("returns 400 for invalid input", async () => {
		const response = await createMcqPost(
			jsonRequest({
				...validCreateBody,
				choices: [{ choiceText: "Only one", isCorrect: true }],
			}),
		);

		expect(response.status).toBe(400);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("VALIDATION_ERROR");
		expect(createQuestion).not.toHaveBeenCalled();
	});

	it("returns 400 for malformed JSON", async () => {
		const response = await createMcqPost(
			new Request("http://localhost/api/mcqs", {
				method: "POST",
				body: "{",
			}),
		);

		expect(response.status).toBe(400);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("INVALID_JSON");
	});
});

describe("GET /api/mcqs/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with question including isCorrect on choices", async () => {
		vi.mocked(getQuestionById).mockResolvedValue(mockMcqQuestion);

		const response = await getMcqById(new Request("http://localhost/api/mcqs/q1"), {
			params: Promise.resolve({ id: "q1" }),
		});

		expect(response.status).toBe(200);
		const body = await readJson<{ question: McqQuestion }>(response);
		expect(body.question.choices[0]?.isCorrect).toBe(true);
	});

	it("returns 404 when question is not found", async () => {
		vi.mocked(getQuestionById).mockResolvedValue(null);

		const response = await getMcqById(new Request("http://localhost/api/mcqs/missing"), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("QUESTION_NOT_FOUND");
	});
});

describe("GET /api/mcqs/[id]/preview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns choices without isCorrect", async () => {
		vi.mocked(getQuestionForPreview).mockResolvedValue(mockMcqPreview);

		const response = await getMcqPreview(new Request("http://localhost/api/mcqs/q1/preview"), {
			params: Promise.resolve({ id: "q1" }),
		});

		expect(response.status).toBe(200);
		const body = await readJson<{ question: McqPreviewQuestion }>(response);
		expect(body.question.choices[0]).not.toHaveProperty("isCorrect");
	});

	it("returns 404 when question is not found", async () => {
		vi.mocked(getQuestionForPreview).mockResolvedValue(null);

		const response = await getMcqPreview(new Request("http://localhost/api/mcqs/missing/preview"), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
	});
});

describe("PATCH /api/mcqs/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with updated question", async () => {
		const updated = { ...mockMcqQuestion, name: "Updated Name" };
		vi.mocked(updateQuestion).mockResolvedValue(updated);

		const response = await patchMcqById(jsonRequest({ ...validCreateBody, name: "Updated Name" }), {
			params: Promise.resolve({ id: "q1" }),
		});

		expect(response.status).toBe(200);
		const body = await readJson<{ question: McqQuestion }>(response);
		expect(body.question.name).toBe("Updated Name");
	});

	it("returns 404 when question does not exist", async () => {
		vi.mocked(updateQuestion).mockResolvedValue(null);

		const response = await patchMcqById(jsonRequest(validCreateBody), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
	});

	it("returns 400 for invalid input", async () => {
		const response = await patchMcqById(
			jsonRequest({
				...validCreateBody,
				choices: [
					{ choiceText: "Paris", isCorrect: true },
					{ choiceText: "London", isCorrect: true },
				],
			}),
			{ params: Promise.resolve({ id: "q1" }) },
		);

		expect(response.status).toBe(400);
		expect(updateQuestion).not.toHaveBeenCalled();
	});
});

describe("DELETE /api/mcqs/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 when question is deleted", async () => {
		vi.mocked(deleteQuestion).mockResolvedValue(true);

		const response = await deleteMcqById(new Request("http://localhost/api/mcqs/q1"), {
			params: Promise.resolve({ id: "q1" }),
		});

		expect(response.status).toBe(200);
		const body = await readJson<{ success: boolean }>(response);
		expect(body.success).toBe(true);
	});

	it("returns 404 when question is not found", async () => {
		vi.mocked(deleteQuestion).mockResolvedValue(false);

		const response = await deleteMcqById(new Request("http://localhost/api/mcqs/missing"), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
	});
});

describe("POST /api/mcqs/[id]/attempts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns server-computed correctness", async () => {
		vi.mocked(recordAttempt).mockResolvedValue({ ok: true, isCorrect: true });

		const response = await recordAttemptPost(
			jsonRequest({ selectedChoiceId: "c1" }),
			{ params: Promise.resolve({ id: "q1" }) },
		);

		expect(response.status).toBe(200);
		const body = await readJson<{ isCorrect: boolean }>(response);
		expect(body.isCorrect).toBe(true);
		expect(recordAttempt).toHaveBeenCalledWith("q1", "c1");
	});

	it("ignores client-supplied isCorrect and only passes selectedChoiceId to service", async () => {
		vi.mocked(recordAttempt).mockResolvedValue({ ok: true, isCorrect: false });

		await recordAttemptPost(
			jsonRequest({ selectedChoiceId: "c2", isCorrect: true }),
			{ params: Promise.resolve({ id: "q1" }) },
		);

		expect(recordAttempt).toHaveBeenCalledWith("q1", "c2");
	});

	it("returns 404 when question is not found", async () => {
		vi.mocked(recordAttempt).mockResolvedValue({ ok: false, code: "QUESTION_NOT_FOUND" });

		const response = await recordAttemptPost(jsonRequest({ selectedChoiceId: "c1" }), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
	});

	it("returns 400 when choice is invalid for question", async () => {
		vi.mocked(recordAttempt).mockResolvedValue({ ok: false, code: "INVALID_CHOICE" });

		const response = await recordAttemptPost(jsonRequest({ selectedChoiceId: "bad" }), {
			params: Promise.resolve({ id: "q1" }),
		});

		expect(response.status).toBe(400);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("INVALID_CHOICE");
	});

	it("returns 400 when selectedChoiceId is missing", async () => {
		const response = await recordAttemptPost(jsonRequest({}), {
			params: Promise.resolve({ id: "q1" }),
		});

		expect(response.status).toBe(400);
		expect(recordAttempt).not.toHaveBeenCalled();
	});
});
