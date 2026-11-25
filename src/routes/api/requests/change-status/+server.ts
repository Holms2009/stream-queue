import { json } from '@sveltejs/kit';

import { changeRequestStatus } from '@server/request';
import { requestIdsSchema, requestStatusSchema } from '../../../../lib/utils/request/validation';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.session) return json({ error: 'Требуется авторизация.' }, { status: 401 });
	if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
		return json({ error: 'Некорректный формат запроса.' }, { status: 415 });

	let input: unknown;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Некорректные данные запроса.' }, { status: 400 });
	}
	if (!input || typeof input !== 'object' || Array.isArray(input))
		return json({ error: 'Некорректные данные запроса.' }, { status: 400 });

	const ids = requestIdsSchema.safeParse(input);
	if (!ids.success) return json({ error: 'Не удалось изменить статус заказа. Обновите страницу.' }, { status: 400 });
	const { status, position } = input as Record<string, unknown>;
	const parsedStatus = requestStatusSchema.safeParse(status);
	if (!parsedStatus.success) return json({ error: 'Не удалось изменить статус заказа. Обновите страницу.' }, { status: 400 });
	try {
		const result = await changeRequestStatus({
			userId: locals.session.userId,
			...ids.data,
			status: parsedStatus.data,
			position
		});
		if (!result.success) return json({ error: 'Не удалось изменить статус заказа. Обновите страницу.' }, { status: 400 });
		return json({ success: true });
	} catch (error) {
		console.error('Ошибка изменения статуса заказа:', error);
		return json({ error: 'Не удалось изменить статус заказа. Попробуйте позже.' }, { status: 500 });
	}
};
