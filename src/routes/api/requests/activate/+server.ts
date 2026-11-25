import { json } from '@sveltejs/kit';

import { activateRequest } from '@server/request';
import { activateRequestSchema } from '../../../../lib/utils/request/validation';
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

	const parsed = activateRequestSchema.safeParse(input);
	if (!parsed.success) return json({ error: 'Не удалось включить заказ. Обновите страницу.' }, { status: 400 });
	try {
		const result = await activateRequest({
			userId: locals.session.userId,
			...parsed.data
		});
		if (!result.success) return json({ error: 'Не удалось включить заказ. Обновите страницу.' }, { status: 400 });
		return json({ success: true });
	} catch (error) {
		console.error('Ошибка включения заказа:', error);
		return json({ error: 'Не удалось включить заказ. Попробуйте позже.' }, { status: 500 });
	}
};
