import { z } from 'zod';

import { getUserByEmail } from '@db/actions/user';
import { sendResetPasswordLink } from '@server/email/actions/auth';
import { passwordResetRequestSchema } from '../../utils/auth/validation';
import type { AppErrors } from '../../utils/errors';
import { createPasswordResetToken } from './tokens';

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
