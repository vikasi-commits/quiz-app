"use client";

import { EllipsisVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { McqQuestionSummary } from "@/lib/services/mcq-service";

type McqListTableProps = {
	questions: McqQuestionSummary[];
	onDelete: (questionId: string) => Promise<void>;
};

export function McqListTable({ questions, onDelete }: McqListTableProps) {
	const router = useRouter();
	const [questionToDelete, setQuestionToDelete] = useState<McqQuestionSummary | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleDelete() {
		if (!questionToDelete) {
			return;
		}

		setIsDeleting(true);
		setError(null);

		try {
			await onDelete(questionToDelete.id);
			setQuestionToDelete(null);
		} catch {
			setError("Unable to delete question. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<>
			{error ? (
				<div role="alert" className="text-destructive mb-4 text-sm">
					{error}
				</div>
			) : null}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Question</TableHead>
						<TableHead className="w-16 text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{questions.map((question) => (
						<TableRow key={question.id}>
							<TableCell className="font-medium">{question.name}</TableCell>
							<TableCell className="max-w-md whitespace-normal">{question.questionText}</TableCell>
							<TableCell className="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button variant="ghost" size="icon" aria-label="Open actions menu">
												<EllipsisVertical className="size-4" />
											</Button>
										}
									/>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => router.push(`/mcqs/${question.id}/edit`)}>
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => router.push(`/mcqs/${question.id}/preview`)}>
											Preview
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => setQuestionToDelete(question)}>
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<AlertDialog open={questionToDelete !== null} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this question?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete the question and its choices. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
