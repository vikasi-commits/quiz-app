import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiError, parseJsonBody, validationError } from "@/lib/api/mcqs";

describe("apiError", () => {
	it("returns JSON error body with status code", async () => {
		const response = apiError("Question not found", "QUESTION_NOT_FOUND", 404);
		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({
			error: "Question not found",
			code: "QUESTION_NOT_FOUND",
		});
	});
});

describe("validationError", () => {
	it("returns first zod issue message with VALIDATION_ERROR code", async () => {
		const schema = z.object({ name: z.string().min(1) });
		const parsed = schema.safeParse({ name: "" });
		if (parsed.success) {
			throw new Error("expected validation failure");
		}

		const response = validationError(parsed.error);
		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
	});
});

describe("parseJsonBody", () => {
	it("returns parsed JSON for valid request body", async () => {
		const result = await parseJsonBody(
			new Request("http://localhost", {
				method: "POST",
				body: JSON.stringify({ name: "Test" }),
			}),
		);
		expect(result).toEqual({ name: "Test" });
	});

	it("returns INVALID_JSON response for malformed JSON", async () => {
		const result = await parseJsonBody(new Request("http://localhost", { method: "POST", body: "{" }));
		expect(result).toBeInstanceOf(Response);
		if (result instanceof Response) {
			expect(result.status).toBe(400);
			await expect(result.json()).resolves.toMatchObject({ code: "INVALID_JSON" });
		}
	});
});
