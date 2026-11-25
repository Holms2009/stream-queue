import { z } from 'zod';

import { withTransaction } from '@db';
import { consumePasswordResetToken, getPasswordResetToken } from '@db/actions/passwordReset';
import { deleteUserSessions } from '@db/actions/session';
import { getUserByEmail, getUserByID, updateUser } from '@db/actions/user';
import { sendResetPasswordLink } from '@server/email/actions/auth';
import { passwordResetRequestSchema, resetPasswordSchema } from '../../utils/auth/validation';
import type { AppErrors } from '../../utils/errors';
import { hashPassword } from './password';
import { createPasswordResetToken, hashToken } from './tokens';

export async function requestPasswordReset(input: unknown, origin: string) {
	const result = passwordResetRequestSchema.safeParse(input);

	if (!result.success) {
		const errors: AppErrors = z.flattenError(result.error);

		return { success: false as const, errors };
	}

	const { email } = result.data;
	const user = await getUserByEmail(email);

	if (!user) return { success: true as const };

	const token = await createPasswordResetToken(user.id);

	try {
		await sendResetPasswordLink({ email: user.email, token, origin });
	} catch (error) {
		console.error('Ошибка отправки письма сброса пароля:', error);
	}

	return { success: true as const };
}

export async function resetPassword(token: string, input: unknown) {
	const result = resetPasswordSchema.safeParse(input);

	if (!result.success) {
		const errors: AppErrors = z.flattenError(result.error);
		return { success: false as const, reason: 'invalid' as const, errors };
	}

	const passwordHash = await hashPassword(result.data.password);
	const updated = await resetPasswordByTokenHash(hashToken(token), passwordHash);

	if (!updated) return { success: false as const, reason: 'invalid-token' as const };

	return { success: true as const };
}

export async function resetPasswordByTokenHash(tokenHash: string, passwordHash: string) {
	return await withTransaction(async (transaction) => {
		const token = await getPasswordResetToken(tokenHash, transaction);
		if (!token) return false;
		const user = await getUserByID(token.userId, transaction, true);
		if (!user) return false;
		const consumedToken = await consumePasswordResetToken(user.id, tokenHash, transaction);
		if (!consumedToken) return false;
		await updateUser(user.id, { passwordHash }, transaction);
		await deleteUserSessions(user.id, transaction);
		return true;
	});
}
