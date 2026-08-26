import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "@/components/auth/register-form";
import { mockSafeUser } from "@/lib/test/helpers";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

describe("RegisterForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("redirects to /mcqs after successful registration", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => ({ user: mockSafeUser }),
			}),
		);

		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/last name/i), "Doe");
		await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
		await user.type(screen.getByLabelText(/^password$/i), "securePass123");
		await user.type(screen.getByLabelText(/confirm password/i), "securePass123");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/mcqs");
		});
	});

	it("shows validation error when passwords do not match", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
		await user.type(screen.getByLabelText(/^password$/i), "securePass123");
		await user.type(screen.getByLabelText(/confirm password/i), "differentPass");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/passwords do not match/i);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("shows API error when registration fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 409,
				json: async () => ({ error: "An account with this email already exists", code: "EMAIL_TAKEN" }),
			}),
		);

		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
		await user.type(screen.getByLabelText(/^password$/i), "securePass123");
		await user.type(screen.getByLabelText(/confirm password/i), "securePass123");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
	});
});
