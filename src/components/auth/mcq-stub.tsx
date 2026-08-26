"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearClientUser, getClientUser, type ClientUser } from "@/lib/auth/client-user";

export function McqStub() {
	const router = useRouter();
	const [user] = useState<ClientUser | null>(() => getClientUser());
	const [isLoggingOut, setIsLoggingOut] = useState(false);

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
			<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12">
				<Card>
					<CardHeader>
						<CardTitle>MCQ Test Bank</CardTitle>
						<CardDescription>MCQ creation coming in the next sprint.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{user ? (
							<p className="text-sm">Welcome, {user.firstName}.</p>
						) : (
							<p className="text-muted-foreground text-sm">
								You are viewing the MCQ stub page. Sign in again from the login page to see your name
								here.
							</p>
						)}
						<Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
							{isLoggingOut ? "Logging out..." : "Log out"}
						</Button>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
