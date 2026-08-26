import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUserFromRegisterInput } from "@/lib/api/users";
import { mockSafeUser } from "@/lib/test/helpers";

vi.mock("@/lib/auth/password", () => ({
	hashPassword: vi.fn(async () => "$2a$10$hashed"),
}));

vi.mock("@/lib/services/user-service", () => ({
	createUser: vi.fn(),
	emailTakenByOtherUser: vi.fn(),
}));

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
