import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqPreview } from "@/components/mcq/mcq-preview";
import { mockMcqPreview } from "@/lib/test/mcq-helpers";

describe("McqPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("renders question text and choices", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ question: mockMcqPreview }),
			}),
		);

		render(<McqPreview questionId="q1" />);

		expect(await screen.findByText("What is the capital of France?")).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Paris" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "London" })).toBeInTheDocument();
	});

	it("disables submit until a choice is selected", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ question: mockMcqPreview }),
			}),
		);

		render(<McqPreview questionId="q1" />);

		expect(await screen.findByRole("button", { name: /submit answer/i })).toBeDisabled();
	});

	it("shows correct feedback after submission", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ question: mockMcqPreview }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ isCorrect: true }),
				}),
		);

		const user = userEvent.setup();
		render(<McqPreview questionId="q1" />);

		await screen.findByRole("radio", { name: "Paris" });
		await user.click(screen.getByRole("radio", { name: "Paris" }));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
	});

	it("shows incorrect feedback without revealing the right answer", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ question: mockMcqPreview }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ isCorrect: false }),
				}),
		);

		const user = userEvent.setup();
		render(<McqPreview questionId="q1" />);

		await screen.findByRole("radio", { name: "London" });
		await user.click(screen.getByRole("radio", { name: "London" }));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(await screen.findByText(/incorrect/i)).toBeInTheDocument();
		expect(screen.queryByText(/the correct answer is/i)).not.toBeInTheDocument();
	});
});
