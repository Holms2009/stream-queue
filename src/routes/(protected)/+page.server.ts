import { resolve } from '$app/paths';
import { error, fail, redirect } from '@sveltejs/kit';

import { getLatestQueueWithRequests } from '@db/actions/queue';
import { deleteSession } from '@db/actions/session';
import { deleteSessionTokenCookie } from '@server/auth/session';
import { createRequest } from '@server/request';
import type { AppErrors } from '../../lib/utils/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, resolve('/login'));

	const data = await getLatestQueueWithRequests(locals.session.userId);

	if (!data) error(500, 'Не удалось найти очередь');

	return data;
};

export const actions = {
	addRequest: async ({ locals, request }) => {
		if (!locals.session) redirect(303, resolve('/login'));

		const formData = await request.formData();
		const queueId = formData.get('queueId');

		try {
			const result = await createRequest({
				userId: locals.session.userId,
				queueId: typeof queueId === 'string' ? Number(queueId) : NaN,
				input: { title: formData.get('title'), viewerName: formData.get('viewerName') }
			});

			if (!result.success) {
				if (result.reason === 'invalid')
					return fail(400, { status: 'invalid' as const, errors: result.errors });
				return fail(404, {
					status: 'error' as const,
					errors: {
						formErrors: ['Очередь не найдена. Обновите страницу.'],
						fieldErrors: {}
					} satisfies AppErrors
				});
			}

			return { status: 'success' as const };
		} catch (error) {
			console.error('Ошибка добавления заказа:', error);
			return fail(500, {
				status: 'error' as const,
				errors: {
					formErrors: ['Не удалось добавить заказ. Попробуйте позже.'],
					fieldErrors: {}
				} satisfies AppErrors
			});
		}
	},
	logout: async (event) => {
		const { session } = event.locals;

		if (!session) redirect(303, resolve('/login'));

		try {
			await deleteSession(session.id);
		} catch {
			return fail(500, { error: 'Не удалось выйти. Попробуйте позже.' });
		}

		deleteSessionTokenCookie(event);
		redirect(303, resolve('/login'));
	}
} satisfies Actions;
