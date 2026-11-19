import { z } from 'zod';

import { addUserWithData, getUserByEmail } from '@db/actions/user';
import { registrationSchema } from '../../utils/auth/validation';
import type { AppErrors } from '../../utils/errors';
import { hashPassword } from './password';

export async function registerUser(input: unknown) {
	const result = registrationSchema.safeParse(input);

	if (!result.success) {
		const errors: AppErrors = z.flattenError(result.error);

		return {
			success: false as const,
			reason: 'invalid' as const,
			errors
		};
	}

	const { email, password } = result.data;
	const emailConflict = {
		success: false as const,
		reason: 'email-conflict' as const,
		errors: {
			formErrors: [],
			fieldErrors: { email: ['Почта уже используется'] }
		} satisfies AppErrors
	};

	if (await getUserByEmail(email)) return emailConflict;

	const passwordHash = await hashPassword(password);
	const userId = await addUserWithData(email, passwordHash);

	if (userId === null) return emailConflict;

	return { success: true as const, userId, email };
}
