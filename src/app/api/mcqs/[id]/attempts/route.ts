import { apiError, parseJsonBody, validationError } from "@/lib/api/mcqs";
import { recordAttempt } from "@/lib/services/mcq-service";
import { recordAttemptSchema } from "@/lib/validation/mcq-schemas";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
	const { id } = await context.params;
	const body = await parseJsonBody(request);
	if (body instanceof Response) {
		return body;
	}

	const parsed = recordAttemptSchema.safeParse(body);
	if (!parsed.success) {
		return validationError(parsed.error);
	}

	try {
		const result = await recordAttempt(id, parsed.data.selectedChoiceId, parsed.data.attemptNumber);

		if (!result.ok) {
			if (result.code === "QUESTION_NOT_FOUND") {
				return apiError("Question not found", "QUESTION_NOT_FOUND", 404);
			}

			return apiError("Selected choice is invalid for this question", "INVALID_CHOICE", 400);
		}

		return Response.json({
			isCorrect: result.isCorrect,
			attemptNumber: result.attemptNumber,
			attemptsRemaining: result.attemptsRemaining,
			isExhausted: result.isExhausted,
			correctChoice: result.correctChoice,
		});
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}
