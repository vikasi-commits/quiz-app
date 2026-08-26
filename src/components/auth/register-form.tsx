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
import { registerSchema } from "@/lib/validation/user-schemas";

type FormErrors = {
	form?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
};

export function RegisterForm() {
	const router = useRouter();
	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrors({});

		const formData = new FormData(event.currentTarget);
		const confirmPassword = String(formData.get("confirmPassword") ?? "");

		const candidate = {
			firstName: String(formData.get("firstName") ?? ""),
			lastName: String(formData.get("lastName") ?? ""),
			email: String(formData.get("email") ?? ""),
			password: String(formData.get("password") ?? ""),
		};

		if (candidate.password !== confirmPassword) {
			setErrors({ form: "Passwords do not match" });
			return;
		}

		const parsed = registerSchema.safeParse(candidate);
		if (!parsed.success) {
			const nextErrors: FormErrors = {};
			for (const issue of parsed.error.issues) {
				const field = issue.path[0];
				if (typeof field === "string" && !(field in nextErrors)) {
					nextErrors[field as keyof FormErrors] = issue.message;
				}
			}
			setErrors(nextErrors);
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(parsed.data),
			});

			const body = (await response.json()) as { user?: unknown; error?: string };

			if (!response.ok) {
				setErrors({ form: body.error ?? "Registration failed" });
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
			setErrors({ form: "Registration failed" });
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
						<CardTitle>Create account</CardTitle>
						<CardDescription>Register to collaborate on the MCQ test bank.</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							<FieldGroup>
								{errors.form ? (
									<div role="alert" className="text-destructive text-sm">
										{errors.form}
									</div>
								) : null}

								<Field data-invalid={!!errors.firstName}>
									<FieldLabel htmlFor="firstName">First name</FieldLabel>
									<Input id="firstName" name="firstName" autoComplete="given-name" required />
									<FieldError errors={errors.firstName ? [{ message: errors.firstName }] : undefined} />
								</Field>

								<Field data-invalid={!!errors.lastName}>
									<FieldLabel htmlFor="lastName">Last name (optional)</FieldLabel>
									<Input id="lastName" name="lastName" autoComplete="family-name" />
									<FieldError errors={errors.lastName ? [{ message: errors.lastName }] : undefined} />
								</Field>

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
										autoComplete="new-password"
										required
									/>
									<FieldError errors={errors.password ? [{ message: errors.password }] : undefined} />
								</Field>

								<Field data-invalid={!!errors.confirmPassword}>
									<FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
									<Input
										id="confirmPassword"
										name="confirmPassword"
										type="password"
										autoComplete="new-password"
										required
									/>
									<FieldError
										errors={
											errors.confirmPassword ? [{ message: errors.confirmPassword }] : undefined
										}
									/>
								</Field>
							</FieldGroup>

							<Button type="submit" className="w-full" disabled={isSubmitting}>
								{isSubmitting ? "Creating account..." : "Create account"}
							</Button>
						</form>

						<p className="text-muted-foreground mt-4 text-center text-sm">
							Already have an account?{" "}
							<Link href="/login" className="text-primary underline-offset-4 hover:underline">
								Log in
							</Link>
						</p>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
