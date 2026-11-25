import { withTransaction } from '@db';
import { deleteEmailVerifyTokens, getEmailVerifyToken } from '@db/actions/emailVerify';
import { getUserByID, updateUser } from '@db/actions/user';
import { sendEmailVerifyLink } from '@server/email/actions/auth';
import { createEmailVerificationToken, hashToken } from './tokens';

export async function sendEmailVerification({
	userId,
	email,
	origin
}: {
	userId: number;
	email: string;
	origin: string;
}): Promise<void> {
	const token = await createEmailVerificationToken(userId);

	if (!token) return;

	await sendEmailVerifyLink({ email, token, origin });
}

export async function resendEmailVerification(userId: number, origin: string): Promise<void> {
	const user = await getUserByID(userId);

	if (!user || user.emailVerified) return;

	await sendEmailVerification({ userId: user.id, email: user.email, origin });
}

export async function confirmEmail(token: string) {
	return await confirmEmailByTokenHash(hashToken(token));
}

export async function confirmEmailByTokenHash(tokenHash: string) {
	return await withTransaction(async (transaction) => {
		const foundToken = await getEmailVerifyToken(tokenHash, transaction);

		if (!foundToken) return { status: 'invalid-token' as const };

		const user = await getUserByID(foundToken.userId, transaction, true);

		if (!user) return { status: 'invalid-token' as const };

		const token = await getEmailVerifyToken(tokenHash, transaction, true);

		if (!token) return { status: 'invalid-token' as const };
		if (token.expiresAt <= new Date()) return { status: 'expired-token' as const };

		await updateUser(token.userId, { emailVerified: true }, transaction);
		await deleteEmailVerifyTokens(token.userId, transaction);

		return { status: 'success' as const };
	});
}
