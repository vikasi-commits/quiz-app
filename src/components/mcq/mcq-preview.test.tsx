import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqPreview } from "@/components/mcq/mcq-preview";
import { mockMcqPreview } from "@/lib/test/mcq-helpers";

function mockFetchSequence(responses: Array<{ ok: boolean; json: () => Promise<unknown> }>) {
	const fetchMock = vi.fn();
	for (const response of responses) {
		fetchMock.mockResolvedValueOnce(response);
	}
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

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

	it("shows correct feedback after a successful first attempt", async () => {
		mockFetchSequence([
			{ ok: true, json: async () => ({ question: mockMcqPreview }) },
			{
				ok: true,
				json: async () => ({
					isCorrect: true,
					attemptNumber: 1,
					attemptsRemaining: 2,
					isExhausted: true,
				}),
			},
		]);

		const user = userEvent.setup();
		render(<McqPreview questionId="q1" />);

		await screen.findByRole("radio", { name: "Paris" });
		await user.click(screen.getByRole("radio", { name: "Paris" }));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /finished/i })).toBeDisabled();
	});

	it("allows another attempt after an incorrect answer with attempts remaining", async () => {
		mockFetchSequence([
			{ ok: true, json: async () => ({ question: mockMcqPreview }) },
			{
				ok: true,
				json: async () => ({
					isCorrect: false,
					attemptNumber: 1,
					attemptsRemaining: 2,
					isExhausted: false,
				}),
			},
		]);

		const user = userEvent.setup();
		render(<McqPreview questionId="q1" />);

		await screen.findByRole("radio", { name: "London" });
		await user.click(screen.getByRole("radio", { name: "London" }));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(await screen.findByText(/2 attempts remaining/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /submit answer/i })).toBeDisabled();
	});

	it("shows the correct answer after the third failed attempt", async () => {
		mockFetchSequence([
			{ ok: true, json: async () => ({ question: mockMcqPreview }) },
			{
				ok: true,
				json: async () => ({
					isCorrect: false,
					attemptNumber: 3,
					attemptsRemaining: 0,
					isExhausted: true,
					correctChoice: { id: "c1", choiceText: "Paris" },
				}),
			},
		]);

		const user = userEvent.setup();
		render(<McqPreview questionId="q1" />);

		await screen.findByRole("radio", { name: "London" });
		await user.click(screen.getByRole("radio", { name: "London" }));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(await screen.findByText(/out of attempts/i)).toBeInTheDocument();
		expect(screen.getByText(/the correct answer is:/i)).toBeInTheDocument();
		expect(screen.getAllByText("Paris")).toHaveLength(2);
	});

	it("shows correct feedback on the third attempt when the answer is right", async () => {
		mockFetchSequence([
			{ ok: true, json: async () => ({ question: mockMcqPreview }) },
			{
				ok: true,
				json: async () => ({
					isCorrect: true,
					attemptNumber: 3,
					attemptsRemaining: 0,
					isExhausted: true,
				}),
			},
		]);

		const user = userEvent.setup();
		render(<McqPreview questionId="q1" />);

		await screen.findByRole("radio", { name: "Paris" });
		await user.click(screen.getByRole("radio", { name: "Paris" }));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(await screen.findByText(/correct! you got it on attempt 3/i)).toBeInTheDocument();
	});
});
