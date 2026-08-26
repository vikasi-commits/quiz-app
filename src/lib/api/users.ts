import type { ZodError } from "zod";

import type { RegisterInput } from "@/lib/validation/user-schemas";
import { hashPassword } from "@/lib/auth/password";
import {
	createUser,
	emailTakenByOtherUser,
	toSafeUser,
	type SafeUser,
	type UserRow,
} from "@/lib/services/user-service";

type ApiErrorBody = {
	error: string;
	code: string;
};

export function apiError(error: string, code: string, status: number): Response {
	return Response.json({ error, code } satisfies ApiErrorBody, { status });
}

export function validationError(error: ZodError): Response {
	const message = error.issues[0]?.message ?? "Validation failed";
	return apiError(message, "VALIDATION_ERROR", 400);
}

export async function parseJsonBody(request: Request): Promise<unknown | Response> {
	try {
		return await request.json();
	} catch {
		return apiError("Invalid JSON body", "INVALID_JSON", 400);
	}
}

export type CreateUserResult =
	| { ok: true; user: SafeUser }
	| { ok: false; code: "EMAIL_TAKEN" };

export async function createUserFromRegisterInput(
	input: RegisterInput,
): Promise<CreateUserResult> {
	if (await emailTakenByOtherUser(input.email)) {
		return { ok: false, code: "EMAIL_TAKEN" };
	}

	const passwordHash = await hashPassword(input.password);

	try {
		const user = await createUser({
			firstName: input.firstName,
			lastName: input.lastName,
			email: input.email,
			passwordHash,
		});
		return { ok: true, user };
	} catch {
		if (await emailTakenByOtherUser(input.email)) {
			return { ok: false, code: "EMAIL_TAKEN" };
		}
		throw new Error("Failed to create user");
	}
}

export function userRowToSafeUser(row: UserRow): SafeUser {
	return toSafeUser({
		id: row.id,
		first_name: row.first_name,
		last_name: row.last_name,
		email: row.email,
		created_at: row.created_at,
		updated_at: row.updated_at,
	});
}
