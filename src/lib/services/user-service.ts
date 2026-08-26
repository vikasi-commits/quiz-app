import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { ListUsersQuery, RegisterInput } from "@/lib/validation/user-schemas";

export type UserRow = {
	id: string;
	first_name: string;
	last_name: string | null;
	email: string;
	password_hash: string;
	created_at: string;
	updated_at: string;
};

export type UpdateUserData = {
	firstName?: string;
	lastName?: string | null;
	email?: string;
	passwordHash?: string;
};

export type SafeUser = {
	id: string;
	firstName: string;
	lastName: string | null;
	email: string;
	createdAt: string;
	updatedAt: string;
};

export type CreateUserInput = Pick<RegisterInput, "firstName" | "lastName" | "email"> & {
	passwordHash: string;
};

const USER_COLUMNS =
	"id, first_name, last_name, email, password_hash, created_at, updated_at";

async function getDb() {
	const { env } = await getCloudflareContext();
	return env.DB;
}

export function toSafeUser(row: Omit<UserRow, "password_hash">): SafeUser {
	return {
		id: row.id,
		firstName: row.first_name,
		lastName: row.last_name,
		email: row.email,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
	const db = await getDb();
	const lastName = input.lastName?.trim() ? input.lastName.trim() : null;

	const result = await db
		.prepare(
			`INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES (?1, ?2, ?3, ?4)
       RETURNING id, first_name, last_name, email, created_at, updated_at`,
		)
		.bind(input.firstName, lastName, input.email, input.passwordHash)
		.all<Omit<UserRow, "password_hash">>();

	const user = result.results[0];
	if (!user) {
		throw new Error("Failed to create user");
	}

	return toSafeUser(user);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
	const db = await getDb();
	const result = await db
		.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?1 COLLATE NOCASE`)
		.bind(email)
		.all<UserRow>();

	return result.results[0] ?? null;
}

export async function findUserById(id: string): Promise<SafeUser | null> {
	const db = await getDb();
	const result = await db
		.prepare(
			`SELECT id, first_name, last_name, email, created_at, updated_at
       FROM users WHERE id = ?1`,
		)
		.bind(id)
		.all<Omit<UserRow, "password_hash">>();

	const user = result.results[0];
	return user ? toSafeUser(user) : null;
}

export async function findUserByIdWithPassword(id: string): Promise<UserRow | null> {
	const db = await getDb();
	const result = await db
		.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?1`)
		.bind(id)
		.all<UserRow>();

	return result.results[0] ?? null;
}

export async function listUsers(query: ListUsersQuery): Promise<{ users: SafeUser[]; total: number }> {
	const db = await getDb();

	const countResult = await db.prepare("SELECT COUNT(*) AS total FROM users").all<{ total: number }>();
	const total = countResult.results[0]?.total ?? 0;

	const result = await db
		.prepare(
			`SELECT id, first_name, last_name, email, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ?1 OFFSET ?2`,
		)
		.bind(query.limit, query.offset)
		.all<Omit<UserRow, "password_hash">>();

	return {
		users: result.results.map(toSafeUser),
		total,
	};
}

export async function updateUser(id: string, input: UpdateUserData): Promise<SafeUser | null> {
	const existing = await findUserByIdWithPassword(id);
	if (!existing) {
		return null;
	}

	const setClauses: string[] = [];
	const bindings: unknown[] = [];
	let paramIndex = 1;

	if (input.firstName !== undefined) {
		setClauses.push(`first_name = ?${paramIndex++}`);
		bindings.push(input.firstName);
	}

	if (input.lastName !== undefined) {
		setClauses.push(`last_name = ?${paramIndex++}`);
		bindings.push(input.lastName?.trim() ? input.lastName.trim() : null);
	}

	if (input.email !== undefined) {
		setClauses.push(`email = ?${paramIndex++}`);
		bindings.push(input.email);
	}

	if (input.passwordHash !== undefined) {
		setClauses.push(`password_hash = ?${paramIndex++}`);
		bindings.push(input.passwordHash);
	}

	setClauses.push("updated_at = CURRENT_TIMESTAMP");
	bindings.push(id);

	const db = await getDb();
	const result = await db
		.prepare(
			`UPDATE users
       SET ${setClauses.join(", ")}
       WHERE id = ?${paramIndex}
       RETURNING id, first_name, last_name, email, created_at, updated_at`,
		)
		.bind(...bindings)
		.all<Omit<UserRow, "password_hash">>();

	const user = result.results[0];
	return user ? toSafeUser(user) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
	const db = await getDb();
	const result = await db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();
	return (result.meta.changes ?? 0) > 0;
}

export async function emailTakenByOtherUser(email: string, excludeUserId?: string): Promise<boolean> {
	const db = await getDb();

	if (excludeUserId) {
		const result = await db
			.prepare(
				"SELECT id FROM users WHERE email = ?1 COLLATE NOCASE AND id != ?2 LIMIT 1",
			)
			.bind(email, excludeUserId)
			.all<{ id: string }>();

		return result.results.length > 0;
	}

	const user = await findUserByEmail(email);
	return user !== null;
}
