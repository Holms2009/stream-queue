import { resolve } from '$app/paths';
import { fail, redirect } from '@sveltejs/kit';

import { sendEmailVerification } from '@server/auth/email-verification';
import { registerUser } from '@server/auth/registration';
import type { AppErrors } from '../../lib/utils/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.session) redirect(303, resolve('/(protected)'));
};

export const actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		let result;

		try {
			result = await registerUser({
				email: formData.get('email'),
				password: formData.get('password'),
				confirmPassword: formData.get('confirmPassword')
			});
		} catch {
			return fail(500, {
				status: 'registration-error',
				errors: {
					formErrors: ['Не удалось создать аккаунт. Попробуйте позже.'],
					fieldErrors: {}
				} satisfies AppErrors
			});
		}

		if (!result.success) {
			return fail(result.reason === 'email-conflict' ? 409 : 400, {
				status: 'invalid',
				errors: result.errors
			});
		}

		try {
			await sendEmailVerification({
				userId: result.userId,
				email: result.email,
				origin: url.origin
			});
		} catch (error) {
			console.error('Ошибка отправки письма подтверждения:', error);
		}

		redirect(303, resolve('/register/success'));
	}
} satisfies Actions;
