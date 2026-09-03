import { apiError, parseJsonBody, validationError } from "@/lib/api/mcqs";
import { createQuestion, listQuestions } from "@/lib/services/mcq-service";
import { createMcqSchema } from "@/lib/validation/mcq-schemas";

export async function GET(): Promise<Response> {
	try {
		const questions = await listQuestions();
		return Response.json({ questions });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}

export async function POST(request: Request): Promise<Response> {
	const body = await parseJsonBody(request);
	if (body instanceof Response) {
		return body;
	}

	const parsed = createMcqSchema.safeParse(body);
	if (!parsed.success) {
		return validationError(parsed.error);
	}

	try {
		const question = await createQuestion(parsed.data);
		return Response.json({ question }, { status: 201 });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}
