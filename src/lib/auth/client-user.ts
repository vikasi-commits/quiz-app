export const CLIENT_USER_KEY = "quiz-app-user";

export type ClientUser = {
	id: string;
	firstName: string;
	lastName: string | null;
	email: string;
};

export function saveClientUser(user: ClientUser): void {
	if (typeof sessionStorage === "undefined") {
		return;
	}
	sessionStorage.setItem(CLIENT_USER_KEY, JSON.stringify(user));
}

export function getClientUser(): ClientUser | null {
	if (typeof sessionStorage === "undefined") {
		return null;
	}

	const raw = sessionStorage.getItem(CLIENT_USER_KEY);
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as ClientUser;
	} catch {
		return null;
	}
}

export function clearClientUser(): void {
	if (typeof sessionStorage === "undefined") {
		return;
	}
	sessionStorage.removeItem(CLIENT_USER_KEY);
}

export function toClientUser(user: {
	id: string;
	firstName: string;
	lastName: string | null;
	email: string;
}): ClientUser {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
	};
}
