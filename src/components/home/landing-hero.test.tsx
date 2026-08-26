import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LandingHero } from "@/components/home/landing-hero";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

describe("LandingHero", () => {
	it("shows app branding and links to login and register", () => {
		render(<LandingHero />);

		expect(screen.getByText(/collaborative mcq test bank/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
		expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", "/register");
	});
});
