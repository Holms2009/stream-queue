import { z } from 'zod';

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

export type CreateRequestData = z.output<typeof createRequestSchema>;
