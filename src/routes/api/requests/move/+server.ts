import { json } from '@sveltejs/kit';

import { moveRequest } from '@server/request';
import { moveRequestSchema } from '../../../../lib/utils/request/validation';
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
	const parsed = moveRequestSchema.safeParse(input);
	if (!parsed.success) return json({ error: 'Не удалось переместить заказ. Обновите страницу.' }, { status: 400 });

	try {
		const { queueId, requestId, position } = parsed.data;
		const success = await moveRequest(locals.session.userId, queueId, requestId, position);
		if (!success) return json({ error: 'Не удалось переместить заказ. Обновите страницу.' }, { status: 400 });
		return json({ success: true });
	} catch (error) {
		console.error('Ошибка перемещения заказа:', error);
		return json({ error: 'Не удалось переместить заказ. Попробуйте позже.' }, { status: 500 });
	}
};
