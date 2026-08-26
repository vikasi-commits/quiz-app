import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	createUser,
	deleteUser,
	emailTakenByOtherUser,
	findUserByEmail,
	findUserById,
	listUsers,
	toSafeUser,
	updateUser,
} from "@/lib/services/user-service";

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from "@opennextjs/cloudflare";

const mockAll = vi.fn();
const mockRun = vi.fn();
const mockBind = vi.fn(() => ({ all: mockAll, run: mockRun }));
const mockPrepare = vi.fn(() => ({ bind: mockBind, all: mockAll, run: mockRun }));
const mockDb = { prepare: mockPrepare };

const dbRow = {
	id: "abc123",
	first_name: "Jane",
	last_name: "Doe",
	email: "jane@example.com",
	password_hash: "$2a$10$hash",
	created_at: "2026-08-26T10:00:00.000Z",
	updated_at: "2026-08-26T10:00:00.000Z",
};

beforeEach(() => {
	vi.clearAllMocks();
	mockAll.mockReset();
	mockBind.mockReset();
	mockPrepare.mockReset();
	mockRun.mockReset();
	vi.mocked(getCloudflareContext).mockResolvedValue({ env: { DB: mockDb } } as never);
});

function withoutPassword(row: typeof dbRow) {
	const { password_hash: _passwordHash, ...safeRow } = row;
	void _passwordHash;
	return safeRow;
}

describe("toSafeUser", () => {
	it("maps snake_case database columns to camelCase API fields", () => {
		expect(toSafeUser(withoutPassword(dbRow))).toEqual({
			id: "abc123",
			firstName: "Jane",
			lastName: "Doe",
			email: "jane@example.com",
			createdAt: "2026-08-26T10:00:00.000Z",
			updatedAt: "2026-08-26T10:00:00.000Z",
		});
	});
});

describe("createUser", () => {
	it("inserts user with numbered placeholders and returns safe user", async () => {
		const safeRow = withoutPassword(dbRow);
		mockAll.mockResolvedValue({ results: [safeRow] });

		const user = await createUser({
			firstName: "Jane",
			lastName: "Doe",
			email: "jane@example.com",
			passwordHash: "$2a$10$hash",
		});

		expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"));
		expect(mockBind).toHaveBeenCalledWith("Jane", "Doe", "jane@example.com", "$2a$10$hash");
		expect(user.firstName).toBe("Jane");
		expect(user).not.toHaveProperty("passwordHash");
	});

	it("stores null lastName when lastName is empty", async () => {
		const safeRow = withoutPassword({ ...dbRow, last_name: null });
		mockAll.mockResolvedValue({ results: [safeRow] });

		await createUser({
			firstName: "Jane",
			lastName: "",
			email: "jane@example.com",
			passwordHash: "$2a$10$hash",
		});

		expect(mockBind).toHaveBeenCalledWith("Jane", null, "jane@example.com", "$2a$10$hash");
	});
});

describe("findUserByEmail", () => {
	it("uses case-insensitive email lookup", async () => {
		mockAll.mockResolvedValue({ results: [dbRow] });

		const user = await findUserByEmail("Jane@Example.com");

		expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("COLLATE NOCASE"));
		expect(user?.email).toBe("jane@example.com");
	});

	it("returns null when user is not found", async () => {
		mockAll.mockResolvedValue({ results: [] });
		expect(await findUserByEmail("missing@example.com")).toBeNull();
	});
});

describe("findUserById", () => {
	it("returns safe user without password hash", async () => {
		mockAll.mockResolvedValue({ results: [withoutPassword(dbRow)] });

		const user = await findUserById("abc123");

		expect(user?.id).toBe("abc123");
		expect(user).not.toHaveProperty("password_hash");
	});
});

describe("listUsers", () => {
	it("returns users and total count", async () => {
		mockAll.mockResolvedValueOnce({ results: [{ total: 1 }] }).mockResolvedValueOnce({
			results: [withoutPassword(dbRow)],
		});

		const result = await listUsers({ limit: 10, offset: 0 });

		expect(result.total).toBe(1);
		expect(result.users).toHaveLength(1);
	});
});

describe("updateUser", () => {
	it("returns null when user does not exist", async () => {
		mockAll.mockResolvedValue({ results: [] });
		expect(await updateUser("missing", { firstName: "Janet" })).toBeNull();
	});

	it("updates provided fields and returns safe user", async () => {
		const existingRow = withoutPassword(dbRow);
		const updatedRow = { ...existingRow, first_name: "Janet" };
		mockAll.mockResolvedValueOnce({ results: [dbRow] }).mockResolvedValueOnce({ results: [updatedRow] });

		const user = await updateUser("abc123", { firstName: "Janet" });

		expect(user?.firstName).toBe("Janet");
	});
});

describe("deleteUser", () => {
	it("returns true when a row is deleted", async () => {
		mockRun.mockResolvedValue({ meta: { changes: 1 } });
		expect(await deleteUser("abc123")).toBe(true);
	});

	it("returns false when no row is deleted", async () => {
		mockRun.mockResolvedValue({ meta: { changes: 0 } });
		expect(await deleteUser("missing")).toBe(false);
	});
});

describe("emailTakenByOtherUser", () => {
	it("returns true when another user has the email", async () => {
		mockAll.mockResolvedValue({ results: [{ id: "other" }] });
		expect(await emailTakenByOtherUser("jane@example.com", "abc123")).toBe(true);
	});

	it("returns false when email is available", async () => {
		mockAll.mockResolvedValue({ results: [] });
		expect(await emailTakenByOtherUser("new@example.com", "abc123")).toBe(false);
	});
});
