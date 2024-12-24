import { z } from 'zod';

export const WhisperResponseSchema = z.union([
	z.object({
		text: z.string(),
	}),
	z.object({
		error: z.object({
			message: z.string(),
		}),
	}),
]);
