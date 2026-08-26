import { registerSchema } from "@/lib/validation/user-schemas";
import {
	apiError,
	createUserFromRegisterInput,
	parseJsonBody,
	validationError,
} from "@/lib/api/users";

export async function POST(request: Request): Promise<Response> {
	const body = await parseJsonBody(request);
	if (body instanceof Response) {
		return body;
	}

	const parsed = registerSchema.safeParse(body);
	if (!parsed.success) {
		return validationError(parsed.error);
	}

	try {
		const result = await createUserFromRegisterInput(parsed.data);
		if (!result.ok) {
			return apiError("An account with this email already exists", "EMAIL_TAKEN", 409);
		}

		return Response.json({ user: result.user }, { status: 201 });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}
