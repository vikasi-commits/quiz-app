import { describe, expect, it } from "vitest";

import { createMcqSchema, recordAttemptSchema, updateMcqSchema } from "@/lib/validation/mcq-schemas";

const validChoices = [
	{ choiceText: "Paris", isCorrect: true },
	{ choiceText: "London", isCorrect: false },
];

const validInput = {
	name: "Chapter 5 Review",
	questionText: "What is the capital of France?",
	choices: validChoices,
};

describe("createMcqSchema", () => {
	it("accepts valid input with two choices and one correct", () => {
		const result = createMcqSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("trims name and questionText", () => {
		const result = createMcqSchema.safeParse({
			...validInput,
			name: "  Chapter 5  ",
			questionText: "  What is the capital?  ",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Chapter 5");
			expect(result.data.questionText).toBe("What is the capital?");
		}
	});

	it("rejects missing name", () => {
		const result = createMcqSchema.safeParse({
			questionText: "Question?",
			choices: validChoices,
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing questionText", () => {
		const result = createMcqSchema.safeParse({
			name: "Test",
			choices: validChoices,
		});
		expect(result.success).toBe(false);
	});

	it("rejects fewer than two choices", () => {
		const result = createMcqSchema.safeParse({
			...validInput,
			choices: [{ choiceText: "Only one", isCorrect: true }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects more than six choices", () => {
		const result = createMcqSchema.safeParse({
			...validInput,
			choices: Array.from({ length: 7 }, (_, index) => ({
				choiceText: `Choice ${index + 1}`,
				isCorrect: index === 0,
			})),
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty choice text", () => {
		const result = createMcqSchema.safeParse({
			...validInput,
			choices: [
				{ choiceText: "Paris", isCorrect: true },
				{ choiceText: "   ", isCorrect: false },
			],
		});
		expect(result.success).toBe(false);
	});

	it("rejects when no choice is marked correct", () => {
		const result = createMcqSchema.safeParse({
			...validInput,
			choices: [
				{ choiceText: "Paris", isCorrect: false },
				{ choiceText: "London", isCorrect: false },
			],
		});
		expect(result.success).toBe(false);
	});

	it("rejects when multiple choices are marked correct", () => {
		const result = createMcqSchema.safeParse({
			...validInput,
			choices: [
				{ choiceText: "Paris", isCorrect: true },
				{ choiceText: "London", isCorrect: true },
			],
		});
		expect(result.success).toBe(false);
	});
});

describe("updateMcqSchema", () => {
	it("uses the same validation rules as createMcqSchema", () => {
		const result = updateMcqSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});
});

describe("recordAttemptSchema", () => {
	it("accepts a selected choice id and attempt number", () => {
		const result = recordAttemptSchema.safeParse({ selectedChoiceId: "choice-1", attemptNumber: 1 });
		expect(result.success).toBe(true);
	});

	it("rejects empty selectedChoiceId", () => {
		const result = recordAttemptSchema.safeParse({ selectedChoiceId: "", attemptNumber: 1 });
		expect(result.success).toBe(false);
	});

	it("rejects missing selectedChoiceId", () => {
		const result = recordAttemptSchema.safeParse({ attemptNumber: 1 });
		expect(result.success).toBe(false);
	});

	it("rejects attempt numbers outside the allowed range", () => {
		expect(recordAttemptSchema.safeParse({ selectedChoiceId: "choice-1", attemptNumber: 0 }).success).toBe(false);
		expect(recordAttemptSchema.safeParse({ selectedChoiceId: "choice-1", attemptNumber: 4 }).success).toBe(false);
	});
});
