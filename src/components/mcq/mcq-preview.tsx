"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { McqPreviewQuestion } from "@/lib/services/mcq-service";
import { MAX_PREVIEW_ATTEMPTS } from "@/lib/validation/mcq-schemas";

type McqPreviewProps = {
	questionId: string;
};

type AttemptResponse = {
	isCorrect: boolean;
	attemptNumber: number;
	attemptsRemaining: number;
	isExhausted: boolean;
	correctChoice?: { id: string; choiceText: string };
};

type PreviewResult =
	| { status: "correct"; attemptNumber: number }
	| { status: "retry"; attemptsRemaining: number }
	| { status: "exhausted"; correctChoiceText: string; correctChoiceId: string };

export function McqPreview({ questionId }: McqPreviewProps) {
	const [question, setQuestion] = useState<McqPreviewQuestion | null>(null);
	const [selectedChoiceId, setSelectedChoiceId] = useState<string>("");
	const [attemptCount, setAttemptCount] = useState(0);
	const [result, setResult] = useState<PreviewResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isFinished = result?.status === "correct" || result?.status === "exhausted";

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
		if (!selectedChoiceId || isFinished) {
			return;
		}

		const attemptNumber = attemptCount + 1;
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch(`/api/mcqs/${questionId}/attempts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ selectedChoiceId, attemptNumber }),
			});

			if (!response.ok) {
				throw new Error("Unable to submit answer");
			}

			const body = (await response.json()) as AttemptResponse;
			setAttemptCount(attemptNumber);

			if (body.isCorrect) {
				setResult({ status: "correct", attemptNumber: body.attemptNumber });
				return;
			}

			if (body.isExhausted && body.correctChoice) {
				setResult({
					status: "exhausted",
					correctChoiceText: body.correctChoice.choiceText,
					correctChoiceId: body.correctChoice.id,
				});
				return;
			}

			setResult({ status: "retry", attemptsRemaining: body.attemptsRemaining });
			setSelectedChoiceId("");
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
					<p className="text-muted-foreground text-sm">
						Try answering as a student would. You have up to {MAX_PREVIEW_ATTEMPTS} attempts.
					</p>
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

						{attemptCount > 0 && !isFinished ? (
							<p className="text-muted-foreground text-sm">
								Attempt {attemptCount} of {MAX_PREVIEW_ATTEMPTS}
							</p>
						) : null}

						<Field>
							<FieldLabel>Select an answer</FieldLabel>
							<RadioGroup
								value={selectedChoiceId}
								onValueChange={setSelectedChoiceId}
								disabled={isFinished}
							>
								{question.choices.map((choice) => {
									const isRevealedCorrect =
										result?.status === "exhausted" && result.correctChoiceId === choice.id;

									return (
										<div
											key={choice.id}
											className={
												isRevealedCorrect
													? "flex items-center gap-3 rounded-md border border-green-600 bg-green-50 px-3 py-2 dark:border-green-400 dark:bg-green-950/30"
													: "flex items-center gap-3"
											}
										>
											<RadioGroupItem
												value={choice.id}
												id={`preview-choice-${choice.id}`}
												disabled={isFinished}
											/>
											<Label htmlFor={`preview-choice-${choice.id}`}>{choice.choiceText}</Label>
										</div>
									);
								})}
							</RadioGroup>
						</Field>

						{error ? (
							<div role="alert" className="text-destructive text-sm">
								{error}
							</div>
						) : null}

						{result?.status === "correct" ? (
							<p className="font-medium text-green-600 dark:text-green-400">
								Correct! You got it on attempt {result.attemptNumber}.
							</p>
						) : null}

						{result?.status === "retry" ? (
							<p className="text-destructive font-medium">
								Incorrect. You have {result.attemptsRemaining}{" "}
								{result.attemptsRemaining === 1 ? "attempt" : "attempts"} remaining.
							</p>
						) : null}

						{result?.status === "exhausted" ? (
							<div className="space-y-1">
								<p className="text-destructive font-medium">Out of attempts.</p>
								<p className="font-medium">
									The correct answer is: <span className="text-green-600 dark:text-green-400">{result.correctChoiceText}</span>
								</p>
							</div>
						) : null}

						<div className="flex gap-4">
							<Button
								type="submit"
								className="flex-1"
								disabled={!selectedChoiceId || isSubmitting || isFinished}
							>
								{isSubmitting ? "Submitting..." : isFinished ? "Finished" : "Submit answer"}
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
