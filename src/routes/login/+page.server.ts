import { resolve } from '$app/paths';
import { fail, redirect } from '@sveltejs/kit';

import { loginUser } from '@server/auth/login';
import { createSession, generateSessionToken, setSessionTokenCookie } from '@server/auth/session';
import type { AppErrors } from '../../lib/utils/errors';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();

		try {
			const result = await loginUser({
				email: formData.get('email'),
				password: formData.get('password')
			});

			if (!result.success) {
				return fail(result.reason === 'invalid-credentials' ? 401 : 400, {
					status: 'invalid',
					errors: result.errors
				});
			}

			const token = generateSessionToken();
			const session = await createSession(token, result.userId);

			setSessionTokenCookie(cookies, token, session.expiresAt);
		} catch {
			return fail(500, {
				status: 'login-error',
				errors: {
					formErrors: ['Не удалось войти. Попробуйте позже.'],
					fieldErrors: {}
				} satisfies AppErrors
			});
		}

		redirect(303, resolve('/(protected)'));
	}
} satisfies Actions;
