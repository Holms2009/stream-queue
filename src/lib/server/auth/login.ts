import { z } from 'zod';

import { getUserByEmail } from '@db/actions/user';
import { loginSchema } from '../../utils/auth/validation';
import type { AppErrors } from '../../utils/errors';
import { verifyPasswordHash } from './password';

export async function loginUser(input: unknown) {
	const result = loginSchema.safeParse(input);

	if (!result.success) {
		const errors: AppErrors = z.flattenError(result.error);

		return { success: false as const, reason: 'invalid' as const, errors };
	}

	const { email, password } = result.data;
	const user = await getUserByEmail(email);

	if (!user || !(await verifyPasswordHash(user.passwordHash, password))) {
		return {
			success: false as const,
			reason: 'invalid-credentials' as const,
			errors: {
				formErrors: ['Неверная почта или пароль'],
				fieldErrors: {}
			} satisfies AppErrors
		};
	}

	return { success: true as const, userId: user.id };
}
