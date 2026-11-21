import { fail } from '@sveltejs/kit';

import { resetPassword } from '@server/auth/password-reset';
import { verifyResetToken } from '@server/auth/tokens';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) return { status: 'invalid-token' as const };

	try {
		const record = await verifyResetToken(token);
		return { status: record ? ('valid-token' as const) : ('invalid-token' as const) };
	} catch (error) {
		console.error('Ошибка проверки ссылки сброса пароля:', error);
		return { status: 'error' as const };
	}
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const token = formData.get('token');
		if (typeof token !== 'string' || !token) return fail(400, { status: 'invalid-token' as const });

		try {
			const result = await resetPassword(token, {
				password: formData.get('password'),
				confirmPassword: formData.get('confirmPassword')
			});

			if (!result.success) {
				if (result.reason === 'invalid-token')
					return fail(400, { status: 'invalid-token' as const });
				return fail(400, { status: 'invalid' as const, errors: result.errors });
			}

			return { status: 'success' as const };
		} catch (error) {
			console.error('Ошибка смены пароля:', error);
			return fail(500, { status: 'error' as const });
		}
	}
} satisfies Actions;
