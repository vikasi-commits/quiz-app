import Link from "next/link";

export function AppHeader() {
	return (
		<header className="border-border border-b">
			<div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
				<Link href="/" className="text-sm font-semibold">
					Quiz App
				</Link>
			</div>
		</header>
	);
}
