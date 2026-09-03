"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { createMcqSchema, type CreateMcqInput } from "@/lib/validation/mcq-schemas";

type McqQuestionFormProps = {
	initialValues?: CreateMcqInput;
	formError?: string | null;
	footer: React.ReactNode;
	onSubmit: (values: CreateMcqInput) => void | Promise<void>;
};

function createDefaultChoices(): CreateMcqInput["choices"] {
	return [
		{ choiceText: "", isCorrect: true },
		{ choiceText: "", isCorrect: false },
	];
}

export function McqQuestionForm({
	initialValues,
	formError,
	footer,
	onSubmit,
}: McqQuestionFormProps) {
	const [name, setName] = useState(initialValues?.name ?? "");
	const [questionText, setQuestionText] = useState(initialValues?.questionText ?? "");
	const [choices, setChoices] = useState<CreateMcqInput["choices"]>(
		initialValues?.choices ?? createDefaultChoices(),
	);
	const [error, setError] = useState<string | null>(null);

	const correctIndex = choices.findIndex((choice) => choice.isCorrect);

	function updateChoiceText(index: number, value: string) {
		setChoices((current) =>
			current.map((choice, choiceIndex) =>
				choiceIndex === index ? { ...choice, choiceText: value } : choice,
			),
		);
	}

	function setCorrectChoice(index: number) {
		setChoices((current) =>
			current.map((choice, choiceIndex) => ({
				...choice,
				isCorrect: choiceIndex === index,
			})),
		);
	}

	function addChoice() {
		if (choices.length >= 6) {
			return;
		}

		setChoices((current) => [...current, { choiceText: "", isCorrect: false }]);
	}

	function removeChoice(index: number) {
		if (choices.length <= 2) {
			return;
		}

		setChoices((current) => {
			const next = current.filter((_, choiceIndex) => choiceIndex !== index);
			if (!next.some((choice) => choice.isCorrect)) {
				next[0] = { ...next[0]!, isCorrect: true };
			}
			return next;
		});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const parsed = createMcqSchema.safeParse({ name, questionText, choices });
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Validation failed");
			return;
		}

		await onSubmit(parsed.data);
	}

	const displayError = error ?? formError;

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{displayError ? (
				<div role="alert" className="text-destructive text-sm">
					{displayError}
				</div>
			) : null}

			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="mcq-name">Name</FieldLabel>
					<Input
						id="mcq-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="mcq-question-text">Question text</FieldLabel>
					<Textarea
						id="mcq-question-text"
						value={questionText}
						onChange={(event) => setQuestionText(event.target.value)}
						rows={4}
					/>
				</Field>

				<Field>
					<FieldLabel>Choices</FieldLabel>
					<RadioGroup
						value={String(correctIndex >= 0 ? correctIndex : 0)}
						onValueChange={(value) => setCorrectChoice(Number(value))}
						className="space-y-3"
					>
						{choices.map((choice, index) => (
							<div key={index} className="flex items-center gap-3">
								<RadioGroupItem value={String(index)} id={`mcq-correct-${index}`} />
								<div className="grid flex-1 gap-2">
									<Label htmlFor={`mcq-choice-${index}`} className="sr-only">
										Choice text
									</Label>
									<Input
										id={`mcq-choice-${index}`}
										aria-label="Choice text"
										value={choice.choiceText}
										onChange={(event) => updateChoiceText(index, event.target.value)}
										placeholder={`Choice ${index + 1}`}
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => removeChoice(index)}
									disabled={choices.length <= 2}
									aria-label="Remove choice"
								>
									Remove
								</Button>
							</div>
						))}
					</RadioGroup>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-3"
						onClick={addChoice}
						disabled={choices.length >= 6}
					>
						Add choice
					</Button>
				</Field>
			</FieldGroup>

			{footer}
		</form>
	);
}
