import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
	it("hashPassword returns a bcrypt hash different from the plain password", async () => {
		const hash = await hashPassword("securePass123");
		expect(hash).not.toBe("securePass123");
		expect(hash.startsWith("$2")).toBe(true);
	});

	it("verifyPassword returns true for a matching password", async () => {
		const hash = await hashPassword("securePass123");
		expect(await verifyPassword("securePass123", hash)).toBe(true);
	});

	it("verifyPassword returns false for a wrong password", async () => {
		const hash = await hashPassword("securePass123");
		expect(await verifyPassword("wrongPassword", hash)).toBe(false);
	});
});
