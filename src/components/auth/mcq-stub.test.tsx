import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqStub } from "@/components/auth/mcq-stub";
import { saveClientUser } from "@/lib/auth/client-user";
import { mockSafeUser } from "@/lib/test/helpers";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

describe("McqStub", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
	});

	it("shows placeholder content and the logged-in user's first name", () => {
		saveClientUser(mockSafeUser);
		render(<McqStub />);

		expect(screen.getByText(/mcq test bank/i)).toBeInTheDocument();
		expect(screen.getByText(/coming in the next sprint/i)).toBeInTheDocument();
		expect(screen.getByText(/welcome, jane/i)).toBeInTheDocument();
	});

	it("logs out and redirects to /login", async () => {
		saveClientUser(mockSafeUser);
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			}),
		);

		const user = userEvent.setup();
		render(<McqStub />);

		await user.click(screen.getByRole("button", { name: /log out/i }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/login");
		});
	});
});
