import { resolve } from '$app/paths';
import { error, fail, redirect } from '@sveltejs/kit';

import { getLatestQueueWithRequests } from '@db/actions/queue';
import { deleteSession } from '@db/actions/session';
import { deleteSessionTokenCookie } from '@server/auth/session';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) redirect(303, resolve('/login'));

	const data = await getLatestQueueWithRequests(locals.session.userId);

	if (!data) error(500, 'Не удалось найти очередь');

	return data;
};

export const actions = {
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
