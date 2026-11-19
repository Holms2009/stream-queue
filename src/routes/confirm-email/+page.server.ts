import { fail } from '@sveltejs/kit';

import { confirmEmail } from '@server/auth/email-verification';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const token = formData.get('token');

		if (typeof token !== 'string' || !token) {
			return fail(400, { status: 'invalid-token' as const });
		}

		try {
			const result = await confirmEmail(token);

			if (result.status === 'invalid-token') return fail(400, result);
			if (result.status === 'expired-token') return fail(410, result);

			return result;
		} catch (error) {
			console.error('Ошибка подтверждения почты:', error);
			return fail(500, { status: 'error' as const });
		}
	}
} satisfies Actions;
