"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { McqQuestionForm } from "@/components/mcq/mcq-question-form";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import type { McqQuestion } from "@/lib/services/mcq-service";
import type { CreateMcqInput } from "@/lib/validation/mcq-schemas";

type McqQuestionPageProps = {
	mode: "create" | "edit";
	questionId?: string;
};

export function McqQuestionPage({ mode, questionId }: McqQuestionPageProps) {
	const router = useRouter();
	const [initialValues, setInitialValues] = useState<CreateMcqInput | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(mode === "edit");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (mode !== "edit" || !questionId) {
			return;
		}

		async function loadQuestion() {
			setIsLoading(true);
			setLoadError(null);

			try {
				const response = await fetch(`/api/mcqs/${questionId}`);
				if (!response.ok) {
					throw new Error("Question not found");
				}

				const body = (await response.json()) as { question: McqQuestion };
				setInitialValues({
					name: body.question.name,
					questionText: body.question.questionText,
					choices: body.question.choices.map((choice) => ({
						choiceText: choice.choiceText,
						isCorrect: choice.isCorrect,
					})),
				});
			} catch {
				setLoadError("Unable to load this question.");
			} finally {
				setIsLoading(false);
			}
		}

		void loadQuestion();
	}, [mode, questionId]);

	async function handleSubmit(values: CreateMcqInput) {
		setIsSubmitting(true);
		setFormError(null);

		try {
			const response = await fetch(
				mode === "create" ? "/api/mcqs" : `/api/mcqs/${questionId}`,
				{
					method: mode === "create" ? "POST" : "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(values),
				},
			);

			if (!response.ok) {
				const body = (await response.json()) as { error?: string };
				setFormError(body.error ?? "Unable to save question.");
				return;
			}

			router.push("/mcqs");
		} catch {
			setFormError("Unable to save question. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen flex-col">
			<AppHeader />
			<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
				<div>
					<h1 className="text-2xl font-semibold">
						{mode === "create" ? "Create Question" : "Edit Question"}
					</h1>
				</div>

				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading question...</p>
				) : loadError ? (
					<div role="alert" className="text-destructive text-sm">
						{loadError}
					</div>
				) : mode === "create" || initialValues ? (
					<McqQuestionForm
						initialValues={initialValues ?? undefined}
						formError={formError}
						onSubmit={handleSubmit}
						footer={
							<div className="flex gap-4">
								<Button type="submit" className="flex-1" disabled={isSubmitting}>
									{isSubmitting ? "Saving..." : "Save"}
								</Button>
								<Button
									type="button"
									variant="outline"
									className="flex-1"
									onClick={() => router.push("/mcqs")}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
							</div>
						}
					/>
				) : null}
			</main>
		</div>
	);
}
