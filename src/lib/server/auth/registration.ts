import { z } from 'zod';

import { withTransaction } from '@db';
import { addQueue } from '@db/actions/queue';
import { addUser, addUserData, getUserByEmail } from '@db/actions/user';
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

export async function addUserWithData(email: string, passwordHash: string) {
	return await withTransaction(async (transaction) => {
		const user = await addUser(email, passwordHash, transaction);
		if (!user) return null;
		const userData = await addUserData(user.id, transaction);
		if (!userData) throw new Error('Unexpected error while adding user data');
		const queue = await addQueue(user.id, transaction);
		if (!queue) throw new Error('Unexpected error while adding initial queue');
		return user.id;
	});
}
