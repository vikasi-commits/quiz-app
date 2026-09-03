import { apiError, parseJsonBody, validationError } from "@/lib/api/mcqs";
import { deleteQuestion, getQuestionById, updateQuestion } from "@/lib/services/mcq-service";
import { updateMcqSchema } from "@/lib/validation/mcq-schemas";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
	const { id } = await context.params;

	try {
		const question = await getQuestionById(id);
		if (!question) {
			return apiError("Question not found", "QUESTION_NOT_FOUND", 404);
		}

		return Response.json({ question });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
	const { id } = await context.params;
	const body = await parseJsonBody(request);
	if (body instanceof Response) {
		return body;
	}

	const parsed = updateMcqSchema.safeParse(body);
	if (!parsed.success) {
		return validationError(parsed.error);
	}

	try {
		const question = await updateQuestion(id, parsed.data);
		if (!question) {
			return apiError("Question not found", "QUESTION_NOT_FOUND", 404);
		}

		return Response.json({ question });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
	const { id } = await context.params;

	try {
		const deleted = await deleteQuestion(id);
		if (!deleted) {
			return apiError("Question not found", "QUESTION_NOT_FOUND", 404);
		}

		return Response.json({ success: true });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}
