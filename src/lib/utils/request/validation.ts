import { z } from 'zod';

export const requestIdSchema = z.number().int().positive().max(2_147_483_647);
export const requestStatusSchema = z.enum(['waiting', 'active', 'deferred', 'completed', 'canceled', 'deleted']);
export const requestIdsSchema = z.object({ queueId: requestIdSchema, requestId: requestIdSchema });
export const activateRequestSchema = requestIdsSchema.extend({
	previousStatus: z.enum(['completed', 'deferred']).optional()
});

export const createRequestSchema = z.object({
	title: z
		.string({ error: 'Введите название заказа' })
		.trim()
		.min(1, 'Введите название заказа')
		.max(255, 'Название заказа должно содержать не более 255 символов'),
	viewerName: z
		.string({ error: 'Введите ник зрителя' })
		.trim()
		.min(1, 'Введите ник зрителя')
		.max(100, 'Ник зрителя должен содержать не более 100 символов')
});

export const requestPositionSchema = z.number().int().positive().nullable().optional();

export type CreateRequestData = z.output<typeof createRequestSchema>;
