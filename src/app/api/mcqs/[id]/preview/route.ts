import { apiError } from "@/lib/api/mcqs";
import { getQuestionForPreview } from "@/lib/services/mcq-service";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
	const { id } = await context.params;

	try {
		const question = await getQuestionForPreview(id);
		if (!question) {
			return apiError("Question not found", "QUESTION_NOT_FOUND", 404);
		}

		return Response.json({ question });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}
