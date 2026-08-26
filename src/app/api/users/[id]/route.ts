import { hashPassword } from "@/lib/auth/password";
import { apiError, parseJsonBody, validationError } from "@/lib/api/users";
import {
	deleteUser,
	emailTakenByOtherUser,
	findUserById,
	updateUser,
} from "@/lib/services/user-service";
import { updateUserSchema } from "@/lib/validation/user-schemas";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
	const { id } = await context.params;

	try {
		const user = await findUserById(id);
		if (!user) {
			return apiError("User not found", "USER_NOT_FOUND", 404);
		}

		return Response.json({ user });
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

	const parsed = updateUserSchema.safeParse(body);
	if (!parsed.success) {
		return validationError(parsed.error);
	}

	try {
		const existing = await findUserById(id);
		if (!existing) {
			return apiError("User not found", "USER_NOT_FOUND", 404);
		}

		if (parsed.data.email && (await emailTakenByOtherUser(parsed.data.email, id))) {
			return apiError("An account with this email already exists", "EMAIL_TAKEN", 409);
		}

		const updateData: {
			firstName?: string;
			lastName?: string | null;
			email?: string;
			passwordHash?: string;
		} = {};

		if (parsed.data.firstName !== undefined) {
			updateData.firstName = parsed.data.firstName;
		}
		if (parsed.data.lastName !== undefined) {
			updateData.lastName = parsed.data.lastName;
		}
		if (parsed.data.email !== undefined) {
			updateData.email = parsed.data.email;
		}
		if (parsed.data.password !== undefined) {
			updateData.passwordHash = await hashPassword(parsed.data.password);
		}

		const user = await updateUser(id, updateData);
		if (!user) {
			return apiError("User not found", "USER_NOT_FOUND", 404);
		}

		return Response.json({ user });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
	const { id } = await context.params;

	try {
		const deleted = await deleteUser(id);
		if (!deleted) {
			return apiError("User not found", "USER_NOT_FOUND", 404);
		}

		return Response.json({ success: true });
	} catch {
		return apiError("Internal server error", "INTERNAL_ERROR", 500);
	}
}
