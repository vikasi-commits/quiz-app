import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "@/components/auth/login-form";
import { mockSafeUser } from "@/lib/test/helpers";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

describe("LoginForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
	});

	it("redirects to /mcqs after successful login", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ user: mockSafeUser }),
			}),
		);

		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
		await user.type(screen.getByLabelText(/^password$/i), "securePass123");
		await user.click(screen.getByRole("button", { name: /log in/i }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/mcqs");
		});
	});

	it('shows "Invalid email or password" for failed login', async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: async () => ({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" }),
			}),
		);

		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
		await user.type(screen.getByLabelText(/^password$/i), "wrongPassword");
		await user.click(screen.getByRole("button", { name: /log in/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/invalid email or password/i);
	});
});
