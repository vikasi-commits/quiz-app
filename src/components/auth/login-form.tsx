"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveClientUser, toClientUser } from "@/lib/auth/client-user";
import { loginSchema } from "@/lib/validation/user-schemas";

type FormErrors = {
	form?: string;
	email?: string;
	password?: string;
};

export function LoginForm() {
	const router = useRouter();
	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrors({});

		const formData = new FormData(event.currentTarget);
		const candidate = {
			email: String(formData.get("email") ?? ""),
			password: String(formData.get("password") ?? ""),
		};

		const parsed = loginSchema.safeParse(candidate);
		if (!parsed.success) {
			const nextErrors: FormErrors = {};
			for (const issue of parsed.error.issues) {
				const field = issue.path[0];
				if (typeof field === "string") {
					nextErrors[field as keyof FormErrors] = issue.message;
				}
			}
			setErrors(nextErrors);
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(parsed.data),
			});

			const body = (await response.json()) as { user?: unknown; error?: string };

			if (!response.ok) {
				setErrors({ form: body.error ?? "Invalid email or password" });
				return;
			}

			if (body.user && typeof body.user === "object") {
				const user = body.user as {
					id: string;
					firstName: string;
					lastName: string | null;
					email: string;
				};
				saveClientUser(toClientUser(user));
			}

			router.push("/mcqs");
		} catch {
			setErrors({ form: "Invalid email or password" });
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen flex-col">
			<AppHeader />
			<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
				<Card>
					<CardHeader>
						<CardTitle>Log in</CardTitle>
						<CardDescription>Sign in to access the MCQ test bank.</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							<FieldGroup>
								{errors.form ? (
									<div role="alert" className="text-destructive text-sm">
										{errors.form}
									</div>
								) : null}

								<Field data-invalid={!!errors.email}>
									<FieldLabel htmlFor="email">Email</FieldLabel>
									<Input id="email" name="email" type="email" autoComplete="email" required />
									<FieldError errors={errors.email ? [{ message: errors.email }] : undefined} />
								</Field>

								<Field data-invalid={!!errors.password}>
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<Input
										id="password"
										name="password"
										type="password"
										autoComplete="current-password"
										required
									/>
									<FieldError errors={errors.password ? [{ message: errors.password }] : undefined} />
								</Field>
							</FieldGroup>

							<Button type="submit" className="w-full" disabled={isSubmitting}>
								{isSubmitting ? "Signing in..." : "Log in"}
							</Button>
						</form>

						<p className="text-muted-foreground mt-4 text-center text-sm">
							New here?{" "}
							<Link href="/register" className="text-primary underline-offset-4 hover:underline">
								Register
							</Link>
						</p>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
