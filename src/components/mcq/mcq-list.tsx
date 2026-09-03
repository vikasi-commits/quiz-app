"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { McqListTable } from "@/components/mcq/mcq-list-table";
import { Button } from "@/components/ui/button";
import { clearClientUser } from "@/lib/auth/client-user";
import type { McqQuestionSummary } from "@/lib/services/mcq-service";

export function McqList() {
	const router = useRouter();
	const [questions, setQuestions] = useState<McqQuestionSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const loadQuestions = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/mcqs");
			if (!response.ok) {
				throw new Error("Failed to load questions");
			}

			const body = (await response.json()) as { questions: McqQuestionSummary[] };
			setQuestions(body.questions);
		} catch {
			setError("Unable to load questions. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- client fetch for D1 via API
		void loadQuestions();
	}, [loadQuestions]);

	async function handleDelete(questionId: string) {
		const response = await fetch(`/api/mcqs/${questionId}`, { method: "DELETE" });
		if (!response.ok) {
			throw new Error("Failed to delete question");
		}

		await loadQuestions();
	}

	async function handleLogout() {
		setIsLoggingOut(true);

		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} finally {
			clearClientUser();
			router.push("/login");
		}
	}

	return (
		<div className="flex min-h-screen flex-col">
			<AppHeader />
			<main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12">
				<div className="flex items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold">MCQ Test Bank</h1>
						<p className="text-muted-foreground text-sm">Create and manage multiple-choice questions.</p>
					</div>
					<div className="flex gap-2">
						<Button onClick={() => router.push("/mcqs/new")}>Create Question</Button>
						<Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
							{isLoggingOut ? "Logging out..." : "Log out"}
						</Button>
					</div>
				</div>

				{error ? (
					<div role="alert" className="text-destructive text-sm">
						{error}
					</div>
				) : null}

				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading questions...</p>
				) : questions.length === 0 ? (
					<div className="rounded-lg border border-dashed p-8 text-center">
						<p className="text-muted-foreground mb-4 text-sm">No questions yet.</p>
						<Button onClick={() => router.push("/mcqs/new")}>Create Question</Button>
					</div>
				) : (
					<McqListTable questions={questions} onDelete={handleDelete} />
				)}
			</main>
		</div>
	);
}
