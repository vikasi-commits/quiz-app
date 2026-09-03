"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { McqPreviewQuestion } from "@/lib/services/mcq-service";

type McqPreviewProps = {
	questionId: string;
};

export function McqPreview({ questionId }: McqPreviewProps) {
	const [question, setQuestion] = useState<McqPreviewQuestion | null>(null);
	const [selectedChoiceId, setSelectedChoiceId] = useState<string>("");
	const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		async function loadQuestion() {
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(`/api/mcqs/${questionId}/preview`);
				if (!response.ok) {
					throw new Error("Question not found");
				}

				const body = (await response.json()) as { question: McqPreviewQuestion };
				setQuestion(body.question);
			} catch {
				setError("Unable to load this question.");
			} finally {
				setIsLoading(false);
			}
		}

		void loadQuestion();
	}, [questionId]);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedChoiceId) {
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch(`/api/mcqs/${questionId}/attempts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ selectedChoiceId }),
			});

			if (!response.ok) {
				throw new Error("Unable to submit answer");
			}

			const body = (await response.json()) as { isCorrect: boolean };
			setResult(body.isCorrect ? "correct" : "incorrect");
		} catch {
			setError("Unable to submit your answer. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen flex-col">
			<AppHeader />
			<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
				<div>
					<h1 className="text-2xl font-semibold">Preview Question</h1>
					<p className="text-muted-foreground text-sm">Try answering as a student would.</p>
				</div>

				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading question...</p>
				) : error && !question ? (
					<div role="alert" className="text-destructive text-sm">
						{error}
					</div>
				) : question ? (
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="space-y-2">
							<p className="font-medium">{question.name}</p>
							<p>{question.questionText}</p>
						</div>

						<Field>
							<FieldLabel>Select an answer</FieldLabel>
							<RadioGroup value={selectedChoiceId} onValueChange={setSelectedChoiceId}>
								{question.choices.map((choice) => (
									<div key={choice.id} className="flex items-center gap-3">
										<RadioGroupItem value={choice.id} id={`preview-choice-${choice.id}`} />
										<Label htmlFor={`preview-choice-${choice.id}`}>{choice.choiceText}</Label>
									</div>
								))}
							</RadioGroup>
						</Field>

						{error ? (
							<div role="alert" className="text-destructive text-sm">
								{error}
							</div>
						) : null}

						{result === "correct" ? (
							<p className="font-medium text-green-600 dark:text-green-400">Correct!</p>
						) : null}
						{result === "incorrect" ? <p className="text-destructive font-medium">Incorrect.</p> : null}

						<div className="flex gap-4">
							<Button
								type="submit"
								className="flex-1"
								disabled={!selectedChoiceId || isSubmitting || result !== null}
							>
								{isSubmitting ? "Submitting..." : "Submit answer"}
							</Button>
							<Button render={<Link href="/mcqs" />} variant="outline" className="flex-1" nativeButton={false}>
								Back to list
							</Button>
						</div>
					</form>
				) : null}
			</main>
		</div>
	);
}
