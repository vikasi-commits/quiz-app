import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonRequest, mockSafeUser, readJson } from "@/lib/test/helpers";

vi.mock("@/lib/api/users", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/api/users")>();
	return {
		...actual,
		createUserFromRegisterInput: vi.fn(),
	};
});

vi.mock("@/lib/auth/password", () => ({
	hashPassword: vi.fn(async () => "$2a$10$hashed"),
}));

vi.mock("@/lib/services/user-service", () => ({
	listUsers: vi.fn(),
	findUserById: vi.fn(),
	updateUser: vi.fn(),
	deleteUser: vi.fn(),
	emailTakenByOtherUser: vi.fn(),
}));

import { createUserFromRegisterInput } from "@/lib/api/users";
import {
	deleteUser,
	emailTakenByOtherUser,
	findUserById,
	listUsers,
	updateUser,
} from "@/lib/services/user-service";
import { GET as listUsersGet, POST as createUserPost } from "@/app/api/users/route";
import {
	DELETE as deleteUserById,
	GET as getUserById,
	PATCH as patchUserById,
} from "@/app/api/users/[id]/route";

describe("GET /api/users", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns users and total count", async () => {
		vi.mocked(listUsers).mockResolvedValue({ users: [mockSafeUser], total: 1 });

		const response = await listUsersGet(new Request("http://localhost/api/users"));

		expect(response.status).toBe(200);
		const body = await readJson<{ users: typeof mockSafeUser[]; total: number }>(response);
		expect(body.total).toBe(1);
		expect(body.users).toHaveLength(1);
	});

	it("returns 400 for invalid limit query param", async () => {
		const response = await listUsersGet(new Request("http://localhost/api/users?limit=500"));

		expect(response.status).toBe(400);
	});
});

describe("POST /api/users", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 201 when user is created", async () => {
		vi.mocked(createUserFromRegisterInput).mockResolvedValue({ ok: true, user: mockSafeUser });

		const response = await createUserPost(
			jsonRequest({
				firstName: "Jane",
				email: "jane@example.com",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(201);
	});

	it("returns 409 when email already exists", async () => {
		vi.mocked(createUserFromRegisterInput).mockResolvedValue({ ok: false, code: "EMAIL_TAKEN" });

		const response = await createUserPost(
			jsonRequest({
				firstName: "Jane",
				email: "jane@example.com",
				password: "securePass123",
			}),
		);

		expect(response.status).toBe(409);
	});
});

describe("GET /api/users/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with user when found", async () => {
		vi.mocked(findUserById).mockResolvedValue(mockSafeUser);

		const response = await getUserById(new Request("http://localhost/api/users/abc123"), {
			params: Promise.resolve({ id: "abc123" }),
		});

		expect(response.status).toBe(200);
		const body = await readJson<{ user: typeof mockSafeUser }>(response);
		expect(body.user.id).toBe("abc123");
	});

	it("returns 404 when user is not found", async () => {
		vi.mocked(findUserById).mockResolvedValue(null);

		const response = await getUserById(new Request("http://localhost/api/users/missing"), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
		const body = await readJson<{ code: string }>(response);
		expect(body.code).toBe("USER_NOT_FOUND");
	});
});

describe("PATCH /api/users/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with updated user", async () => {
		vi.mocked(findUserById).mockResolvedValue(mockSafeUser);
		vi.mocked(emailTakenByOtherUser).mockResolvedValue(false);
		vi.mocked(updateUser).mockResolvedValue({ ...mockSafeUser, firstName: "Janet" });

		const response = await patchUserById(jsonRequest({ firstName: "Janet" }), {
			params: Promise.resolve({ id: "abc123" }),
		});

		expect(response.status).toBe(200);
		const body = await readJson<{ user: { firstName: string } }>(response);
		expect(body.user.firstName).toBe("Janet");
	});

	it("returns 404 when user does not exist", async () => {
		vi.mocked(findUserById).mockResolvedValue(null);

		const response = await patchUserById(jsonRequest({ firstName: "Janet" }), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
	});

	it("returns 409 when email is taken by another user", async () => {
		vi.mocked(findUserById).mockResolvedValue(mockSafeUser);
		vi.mocked(emailTakenByOtherUser).mockResolvedValue(true);

		const response = await patchUserById(
			jsonRequest({ email: "taken@example.com" }),
			{ params: Promise.resolve({ id: "abc123" }) },
		);

		expect(response.status).toBe(409);
	});

	it("returns 400 when no fields are provided", async () => {
		const response = await patchUserById(jsonRequest({}), {
			params: Promise.resolve({ id: "abc123" }),
		});

		expect(response.status).toBe(400);
	});
});

describe("DELETE /api/users/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 when user is deleted", async () => {
		vi.mocked(deleteUser).mockResolvedValue(true);

		const response = await deleteUserById(new Request("http://localhost/api/users/abc123"), {
			params: Promise.resolve({ id: "abc123" }),
		});

		expect(response.status).toBe(200);
		const body = await readJson<{ success: boolean }>(response);
		expect(body.success).toBe(true);
	});

	it("returns 404 when user is not found", async () => {
		vi.mocked(deleteUser).mockResolvedValue(false);

		const response = await deleteUserById(new Request("http://localhost/api/users/missing"), {
			params: Promise.resolve({ id: "missing" }),
		});

		expect(response.status).toBe(404);
	});
});
