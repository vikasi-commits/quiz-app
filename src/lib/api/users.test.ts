import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
	apiError,
	createUserFromRegisterInput,
	parseJsonBody,
	userRowToSafeUser,
	validationError,
} from "@/lib/api/users";
import { mockSafeUser, mockUserRow } from "@/lib/test/helpers";

vi.mock("@/lib/auth/password", () => ({
	hashPassword: vi.fn(async () => "$2a$10$hashed"),
}));

vi.mock("@/lib/services/user-service", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/services/user-service")>();
	return {
		...actual,
		createUser: vi.fn(),
		emailTakenByOtherUser: vi.fn(),
	};
});

import { hashPassword } from "@/lib/auth/password";
import { createUser, emailTakenByOtherUser } from "@/lib/services/user-service";

describe("createUserFromRegisterInput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns EMAIL_TAKEN when email already exists", async () => {
		vi.mocked(emailTakenByOtherUser).mockResolvedValue(true);

		const result = await createUserFromRegisterInput({
			firstName: "Jane",
			email: "jane@example.com",
			password: "securePass123",
		});

		expect(result).toEqual({ ok: false, code: "EMAIL_TAKEN" });
		expect(createUser).not.toHaveBeenCalled();
	});

	it("hashes password and creates user on success", async () => {
		vi.mocked(emailTakenByOtherUser).mockResolvedValue(false);
		vi.mocked(createUser).mockResolvedValue(mockSafeUser);

		const result = await createUserFromRegisterInput({
			firstName: "Jane",
			lastName: "Doe",
			email: "jane@example.com",
			password: "securePass123",
		});

		expect(hashPassword).toHaveBeenCalledWith("securePass123");
		expect(createUser).toHaveBeenCalledWith({
			firstName: "Jane",
			lastName: "Doe",
			email: "jane@example.com",
			passwordHash: "$2a$10$hashed",
		});
		expect(result).toEqual({ ok: true, user: mockSafeUser });
	});
});

describe("apiError", () => {
	it("returns JSON error body with status code", async () => {
		const response = apiError("Something failed", "SOME_CODE", 418);
		expect(response.status).toBe(418);
		await expect(response.json()).resolves.toEqual({
			error: "Something failed",
			code: "SOME_CODE",
		});
	});
});

describe("validationError", () => {
	it("returns first zod issue message with VALIDATION_ERROR code", async () => {
		const schema = z.object({ email: z.string().email() });
		const parsed = schema.safeParse({ email: "bad" });
		if (parsed.success) {
			throw new Error("expected validation failure");
		}

		const response = validationError(parsed.error);
		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
	});
});

describe("parseJsonBody", () => {
	it("returns parsed JSON for valid request body", async () => {
		const result = await parseJsonBody(
			new Request("http://localhost", {
				method: "POST",
				body: JSON.stringify({ ok: true }),
			}),
		);
		expect(result).toEqual({ ok: true });
	});

	it("returns INVALID_JSON response for malformed JSON", async () => {
		const result = await parseJsonBody(new Request("http://localhost", { method: "POST", body: "{" }));
		expect(result).toBeInstanceOf(Response);
		if (result instanceof Response) {
			expect(result.status).toBe(400);
			await expect(result.json()).resolves.toMatchObject({ code: "INVALID_JSON" });
		}
	});
});

describe("userRowToSafeUser", () => {
	it("strips password_hash from database row", () => {
		const safe = userRowToSafeUser(mockUserRow);
		expect(safe.firstName).toBe("Jane");
		expect(JSON.stringify(safe)).not.toContain("password");
	});
});
