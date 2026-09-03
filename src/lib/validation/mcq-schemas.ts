import { z } from "zod";

const trimmedString = (min: number, max: number) =>
	z
		.string()
		.trim()
		.min(min, `Must be at least ${min} characters`)
		.max(max, `Must be at most ${max} characters`);

const choiceInputSchema = z.object({
	choiceText: trimmedString(1, 1000),
	isCorrect: z.boolean(),
});

const mcqBodySchema = z
	.object({
		name: trimmedString(1, 200),
		questionText: trimmedString(1, 5000),
		choices: z.array(choiceInputSchema).min(2, "At least two choices are required").max(6, "At most six choices are allowed"),
	})
	.refine((data) => data.choices.filter((choice) => choice.isCorrect).length === 1, {
		message: "Exactly one choice must be marked as correct",
		path: ["choices"],
	});

export const createMcqSchema = mcqBodySchema;
export const updateMcqSchema = mcqBodySchema;

export const recordAttemptSchema = z.object({
	selectedChoiceId: z.string().trim().min(1, "Selected choice is required"),
});

export type CreateMcqInput = z.infer<typeof createMcqSchema>;
export type UpdateMcqInput = z.infer<typeof updateMcqSchema>;
export type RecordAttemptInput = z.infer<typeof recordAttemptSchema>;
