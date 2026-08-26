import { describe, expect, it } from "vitest";

import {
	listUsersQuerySchema,
	loginSchema,
	registerSchema,
	updateUserSchema,
} from "@/lib/validation/user-schemas";

describe("registerSchema", () => {
	it("accepts valid input with optional lastName", () => {
		const result = registerSchema.safeParse({
			firstName: "Jane",
			lastName: "Doe",
			email: "Jane@Example.com",
			password: "securePass123",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe("jane@example.com");
		}
	});

	it("accepts valid input without lastName", () => {
		const result = registerSchema.safeParse({
			firstName: "Jane",
			email: "jane@example.com",
			password: "securePass123",
		});
		expect(result.success).toBe(true);
	});

	it("accepts empty lastName string", () => {
		const result = registerSchema.safeParse({
			firstName: "Jane",
			lastName: "",
			email: "jane@example.com",
			password: "securePass123",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing firstName", () => {
		const result = registerSchema.safeParse({
			email: "jane@example.com",
			password: "securePass123",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid email", () => {
		const result = registerSchema.safeParse({
			firstName: "Jane",
			email: "not-an-email",
			password: "securePass123",
		});
		expect(result.success).toBe(false);
	});

	it("rejects password shorter than 8 characters", () => {
		const result = registerSchema.safeParse({
			firstName: "Jane",
			email: "jane@example.com",
			password: "short",
		});
		expect(result.success).toBe(false);
	});
});

describe("loginSchema", () => {
	it("accepts valid credentials", () => {
		const result = loginSchema.safeParse({
			email: "Teacher@School.edu",
			password: "securePass123",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe("teacher@school.edu");
		}
	});

	it("rejects invalid email", () => {
		const result = loginSchema.safeParse({
			email: "bad-email",
			password: "securePass123",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty password", () => {
		const result = loginSchema.safeParse({
			email: "jane@example.com",
			password: "",
		});
		expect(result.success).toBe(false);
	});
});

describe("updateUserSchema", () => {
	it("accepts a single field update", () => {
		const result = updateUserSchema.safeParse({ firstName: "Janet" });
		expect(result.success).toBe(true);
	});

	it("rejects empty update object", () => {
		const result = updateUserSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("rejects password shorter than 8 characters", () => {
		const result = updateUserSchema.safeParse({ password: "short" });
		expect(result.success).toBe(false);
	});

	it("accepts nullable lastName to clear it", () => {
		const result = updateUserSchema.safeParse({ lastName: null });
		expect(result.success).toBe(true);
	});
});

describe("listUsersQuerySchema", () => {
	it("applies defaults when params are omitted", () => {
		const result = listUsersQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(50);
			expect(result.data.offset).toBe(0);
		}
	});

	it("coerces string query params to numbers", () => {
		const result = listUsersQuerySchema.safeParse({ limit: "10", offset: "5" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(10);
			expect(result.data.offset).toBe(5);
		}
	});

	it("rejects limit above 100", () => {
		const result = listUsersQuerySchema.safeParse({ limit: 101 });
		expect(result.success).toBe(false);
	});

	it("rejects negative offset", () => {
		const result = listUsersQuerySchema.safeParse({ offset: -1 });
		expect(result.success).toBe(false);
	});
});
