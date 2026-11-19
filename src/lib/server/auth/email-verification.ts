import { confirmEmailByTokenHash } from '@db/actions/emailVerify';
import { getUserByID } from '@db/actions/user';
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
