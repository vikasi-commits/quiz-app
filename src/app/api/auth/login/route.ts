import { verifyPassword } from "@/lib/auth/password";
import { apiError, parseJsonBody, userRowToSafeUser, validationError } from "@/lib/api/users";
import { findUserByEmail } from "@/lib/services/user-service";
import { loginSchema } from "@/lib/validation/user-schemas";

export async function POST(request: Request): Promise<Response> {
	const body = await parseJsonBody(request);
	if (body instanceof Response) {
		return body;
	}

	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return validationError(parsed.error);
	}

	try {
		const user = await findUserByEmail(parsed.data.email);
		if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
			return apiError("Invalid email or password", "INVALID_CREDENTIALS", 401);
		}

		return Response.json({ user: userRowToSafeUser(user) });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}
