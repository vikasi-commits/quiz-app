import Link from "next/link";

import { AppHeader } from "@/components/layout/app-header";

export function LandingHero() {
	return (
		<div className="flex min-h-screen flex-col">
			<AppHeader />
			<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">Quiz App</h1>
				<p className="text-muted-foreground text-lg">Collaborative MCQ Test Bank</p>
				<p className="text-muted-foreground max-w-md text-sm">
					Register or log in to start building a shared test bank of multiple-choice questions
					with other teachers.
				</p>
				<div className="flex flex-col gap-3 sm:flex-row">
					<Link
						href="/login"
						className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-medium"
					>
						Log in
					</Link>
					<Link
						href="/register"
						className="border-border bg-background hover:bg-muted inline-flex h-10 items-center justify-center rounded-lg border px-6 text-sm font-medium"
					>
						Register
					</Link>
				</div>
			</main>
		</div>
	);
}
