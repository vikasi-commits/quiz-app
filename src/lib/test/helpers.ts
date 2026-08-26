export const mockSafeUser = {
	id: "abc123",
	firstName: "Jane",
	lastName: "Doe",
	email: "jane@example.com",
	createdAt: "2026-08-26T10:00:00.000Z",
	updatedAt: "2026-08-26T10:00:00.000Z",
};

export const mockUserRow = {
	id: "abc123",
	first_name: "Jane",
	last_name: "Doe",
	email: "jane@example.com",
	password_hash: "$2a$10$hashedpasswordvalue",
	created_at: "2026-08-26T10:00:00.000Z",
	updated_at: "2026-08-26T10:00:00.000Z",
};

export async function readJson<T>(response: Response): Promise<T> {
	return response.json() as Promise<T>;
}

export function jsonRequest(body: unknown): Request {
	return new Request("http://localhost/api/test", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}
