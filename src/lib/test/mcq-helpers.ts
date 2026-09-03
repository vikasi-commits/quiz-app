import type { McqPreviewQuestion, McqQuestionSummary } from "@/lib/services/mcq-service";

export const mockMcqSummary: McqQuestionSummary = {
	id: "q1",
	name: "Chapter 5 Review",
	questionText: "What is the capital of France?",
	createdBy: null,
	createdAt: "2026-09-03T10:00:00.000Z",
	updatedAt: "2026-09-03T10:00:00.000Z",
};

export const mockMcqPreview: McqPreviewQuestion = {
	id: "q1",
	name: "Chapter 5 Review",
	questionText: "What is the capital of France?",
	choices: [
		{ id: "c1", choiceText: "Paris", sortOrder: 0 },
		{ id: "c2", choiceText: "London", sortOrder: 1 },
	],
};
