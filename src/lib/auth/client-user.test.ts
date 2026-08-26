import { beforeEach, describe, expect, it } from "vitest";

import {
	CLIENT_USER_KEY,
	clearClientUser,
	getClientUser,
	saveClientUser,
	type ClientUser,
} from "@/lib/auth/client-user";

const mockUser: ClientUser = {
	id: "abc123",
	firstName: "Jane",
	lastName: "Doe",
	email: "jane@example.com",
};

describe("client-user storage", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	it("saveClientUser persists user to sessionStorage", () => {
		saveClientUser(mockUser);
		expect(sessionStorage.getItem(CLIENT_USER_KEY)).toBe(JSON.stringify(mockUser));
	});

	it("getClientUser returns saved user", () => {
		saveClientUser(mockUser);
		expect(getClientUser()).toEqual(mockUser);
	});

	it("getClientUser returns null when nothing is saved", () => {
		expect(getClientUser()).toBeNull();
	});

	it("clearClientUser removes stored user", () => {
		saveClientUser(mockUser);
		clearClientUser();
		expect(getClientUser()).toBeNull();
	});
});
