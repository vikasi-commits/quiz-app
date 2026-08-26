import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockSafeUser, mockUserRow, readJson, jsonRequest } from "@/lib/test/helpers";

vi.mock("@/lib/api/users", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/api/users")>();
	return {
		...actual,
		createUserFromRegisterInput: vi.fn(),
	};
});

vi.mock("@/lib/services/user-service", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/services/user-service")>();
	return {
		...actual,
		findUserByEmail: vi.fn(),
	};
});

vi.mock("@/lib/auth/password", () => ({
	verifyPassword: vi.fn(),
}));

import { createUserFromRegisterInput } from "@/lib/api/users";
import { verifyPassword } from "@/lib/auth/password";
import { findUserByEmail } from "@/lib/services/user-service";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";

describe("POST /api/auth/register", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 201 with user on successful registration", async () => {
		vi.mocked(createUserFromRegisterInput).mockResolvedValue({ ok: true, user: mockSafeUser });

		const response = await registerPost(
			jsonRequest({
				firstName: "Jane",
				lastName: "Doe",
				email: "jane@example.com",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(201);
		const body = await readJson<{ user: typeof mockSafeUser }>(response);
		expect(body.user).toEqual(mockSafeUser);
		expect(JSON.stringify(body)).not.toContain("password");
	});

	it("returns 409 when email is already taken", async () => {
		vi.mocked(createUserFromRegisterInput).mockResolvedValue({ ok: false, code: "EMAIL_TAKEN" });

		const response = await registerPost(
			jsonRequest({
				firstName: "Jane",
				email: "jane@example.com",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(409);
		const body = await readJson<{ error: string; code: string }>(response);
		expect(body.code).toBe("EMAIL_TAKEN");
	});

	it("returns 400 for invalid input", async () => {
		const response = await registerPost(
			jsonRequest({
				firstName: "Jane",
				email: "bad-email",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(400);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("VALIDATION_ERROR");
	});

	it("returns 400 for invalid JSON", async () => {
		const response = await registerPost(
			new Request("http://localhost/api/auth/register", {
				method: "POST",
				body: "not-json",
			}),
		);

		expect(response.status).toBe(400);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("INVALID_JSON");
	});
});

describe("POST /api/auth/login", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with safe user for valid credentials", async () => {
		vi.mocked(findUserByEmail).mockResolvedValue(mockUserRow);
		vi.mocked(verifyPassword).mockResolvedValue(true);

		const response = await loginPost(
			jsonRequest({
				email: "jane@example.com",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(200);
		const body = await readJson<{ user: typeof mockSafeUser }>(response);
		expect(body.user.email).toBe("jane@example.com");
		expect(JSON.stringify(body)).not.toContain("password_hash");
		expect(JSON.stringify(body)).not.toContain("password");
	});

	it("returns 401 for unknown email", async () => {
		vi.mocked(findUserByEmail).mockResolvedValue(null);

		const response = await loginPost(
			jsonRequest({
				email: "missing@example.com",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(401);
		const body = await readJson<{ error: string; code: string }>(response);
		expect(body.error).toBe("Invalid email or password");
		expect(body.code).toBe("INVALID_CREDENTIALS");
	});

	it("returns 401 for wrong password", async () => {
		vi.mocked(findUserByEmail).mockResolvedValue(mockUserRow);
		vi.mocked(verifyPassword).mockResolvedValue(false);

		const response = await loginPost(
			jsonRequest({
				email: "jane@example.com",
				password: "wrongPassword",
			}),
		);

		expect(response.status).toBe(401);
		const body = await readJson<{ error: string; code: string }>(response);
		expect(body.error).toBe("Invalid email or password");
		expect(body.code).toBe("INVALID_CREDENTIALS");
	});

	it("returns 400 for invalid email format", async () => {
		const response = await loginPost(
			jsonRequest({
				email: "not-an-email",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(400);
	});
});

describe("POST /api/auth/logout", () => {
	it("returns 200 with success true", async () => {
		const response = await logoutPost();
		expect(response.status).toBe(200);
		const body = await readJson<{ success: boolean }>(response);
		expect(body.success).toBe(true);
	});
});
