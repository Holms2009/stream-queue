import { fail } from '@sveltejs/kit';

import { requestPasswordReset } from '@server/auth/password-reset';
import type { AppErrors } from '../../lib/utils/errors';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();

		try {
			const result = await requestPasswordReset({ email: formData.get('email') }, url.origin);

			if (!result.success) {
				return fail(400, { status: 'invalid' as const, errors: result.errors });
			}

			return { success: true as const };
		} catch {
			return fail(500, {
				status: 'error' as const,
				errors: {
					formErrors: ['Не удалось отправить запрос. Попробуйте позже.'],
					fieldErrors: {}
				} satisfies AppErrors
			});
		}
	}
} satisfies Actions;
