import { resolve } from '$app/paths';
import { fail, redirect } from '@sveltejs/kit';

import { deleteSession } from '@db/actions/session';
import { deleteSessionTokenCookie } from '@server/auth/session';
import type { Actions } from './$types';

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
