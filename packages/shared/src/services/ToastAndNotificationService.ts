import { z } from 'zod';
import type { WhisperingResult } from '../index.js';

const toastVariantSchema = z.enum([
	'error',
	'warning',
	'success',
	'info',
	'loading',
]);

export const toastAndNotificationOptionsSchema = z.object({
	id: z.string().optional(),
	variant: toastVariantSchema,
	title: z.string(),
	description: z.string(),
	descriptionClass: z.string().optional(),
	action: z
		.discriminatedUnion('type', [
			z.object({
				type: z.literal('link'),
				label: z.string(),
				goto: z.string(),
			}),
			z.object({
				type: z.literal('more-details'),
				error: z.unknown(),
			}),
		])
		.optional(),
});

export type ToastAndNotifyOptions = z.infer<
	typeof toastAndNotificationOptionsSchema
>;
