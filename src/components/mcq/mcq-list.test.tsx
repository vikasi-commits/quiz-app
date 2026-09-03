import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqList } from "@/components/mcq/mcq-list";
import { McqListTable } from "@/components/mcq/mcq-list-table";
import { mockMcqSummary } from "@/lib/test/mcq-helpers";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

describe("McqList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("renders questions in a table", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ questions: [mockMcqSummary] }),
			}),
		);

		render(<McqList />);

		expect(await screen.findByText("Chapter 5 Review")).toBeInTheDocument();
		expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
	});

	it("navigates to create page from the empty-state create button", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ questions: [] }),
			}),
		);

		const user = userEvent.setup();
		render(<McqList />);

		await user.click(await screen.findByRole("button", { name: /create question/i }));

		expect(mockPush).toHaveBeenCalledWith("/mcqs/new");
	});

	it("shows a single create button in the header when questions exist", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ questions: [mockMcqSummary] }),
			}),
		);

		render(<McqList />);

		expect(await screen.findByText("Chapter 5 Review")).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: /create question/i })).toHaveLength(1);
	});
});

describe("McqListTable", () => {
	const onDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows delete confirmation before removing a question", async () => {
		const user = userEvent.setup();
		render(<McqListTable questions={[mockMcqSummary]} onDelete={onDelete} />);

		await user.click(screen.getByRole("button", { name: /open actions menu/i }));
		await user.click(await screen.findByText("Delete"));

		expect(screen.getByText(/delete this question/i)).toBeInTheDocument();
	});

	it("deletes a question after confirmation", async () => {
		onDelete.mockResolvedValue(undefined);
		const user = userEvent.setup();
		render(<McqListTable questions={[mockMcqSummary]} onDelete={onDelete} />);

		await user.click(screen.getByRole("button", { name: /open actions menu/i }));
		await user.click(await screen.findByText("Delete"));
		await user.click(screen.getByRole("button", { name: /^delete$/i }));

		await waitFor(() => {
			expect(onDelete).toHaveBeenCalledWith("q1");
		});
	});
});
