import { z } from "zod";

const trimmedString = (min: number, max: number) =>
	z
		.string()
		.trim()
		.min(min, `Must be at least ${min} characters`)
		.max(max, `Must be at most ${max} characters`);

export const registerSchema = z.object({
	firstName: trimmedString(1, 100),
	lastName: trimmedString(1, 100).optional().or(z.literal("")),
	email: z.string().trim().email("Invalid email address").toLowerCase(),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
	email: z.string().trim().email("Invalid email address").toLowerCase(),
	password: z.string().min(1, "Password is required"),
});

export const updateUserSchema = z
	.object({
		firstName: trimmedString(1, 100).optional(),
		lastName: trimmedString(1, 100).optional().nullable(),
		email: z.string().trim().email("Invalid email address").toLowerCase().optional(),
		password: z.string().min(8, "Password must be at least 8 characters").optional(),
	})
	.refine(
		(data) =>
			data.firstName !== undefined ||
			data.lastName !== undefined ||
			data.email !== undefined ||
			data.password !== undefined,
		{ message: "At least one field must be provided" },
	);

export const listUsersQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
