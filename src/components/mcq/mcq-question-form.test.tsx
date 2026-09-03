import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqQuestionForm } from "@/components/mcq/mcq-question-form";

describe("McqQuestionForm", () => {
	const onSubmit = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders name, question text, and two default choice rows", () => {
		render(
			<McqQuestionForm
				onSubmit={onSubmit}
				footer={<button type="submit">Save</button>}
			/>,
		);

		expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/question text/i)).toBeInTheDocument();
		expect(screen.getAllByLabelText(/choice text/i)).toHaveLength(2);
	});

	it("adds a choice row up to six", async () => {
		const user = userEvent.setup();
		render(
			<McqQuestionForm
				onSubmit={onSubmit}
				footer={<button type="submit">Save</button>}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /add choice/i }));
		expect(screen.getAllByLabelText(/choice text/i)).toHaveLength(3);
	});

	it("does not remove a choice when only two remain", () => {
		render(
			<McqQuestionForm
				onSubmit={onSubmit}
				footer={<button type="submit">Save</button>}
			/>,
		);

		const removeButtons = screen.getAllByRole("button", { name: /remove choice/i });
		for (const button of removeButtons) {
			expect(button).toBeDisabled();
		}
	});

	it("shows validation error for invalid input", async () => {
		const user = userEvent.setup();
		render(
			<McqQuestionForm
				onSubmit={onSubmit}
				footer={<button type="submit">Save</button>}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /^save$/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("submits valid question data", async () => {
		const user = userEvent.setup();
		onSubmit.mockResolvedValue(undefined);

		render(
			<McqQuestionForm
				onSubmit={onSubmit}
				footer={<button type="submit">Save</button>}
			/>,
		);

		await user.type(screen.getByLabelText(/^name$/i), "Chapter 5 Review");
		await user.type(screen.getByLabelText(/question text/i), "What is the capital of France?");
		const choiceInputs = screen.getAllByLabelText(/choice text/i);
		await user.type(choiceInputs[0]!, "Paris");
		await user.type(choiceInputs[1]!, "London");
		await user.click(screen.getByRole("button", { name: /^save$/i }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				name: "Chapter 5 Review",
				questionText: "What is the capital of France?",
				choices: [
					{ choiceText: "Paris", isCorrect: true },
					{ choiceText: "London", isCorrect: false },
				],
			});
		});
	});
});
