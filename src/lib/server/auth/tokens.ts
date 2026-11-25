import crypto from 'crypto';

import { withTransaction } from '@db';
import { addPasswordResetToken, deletePasswordResetTokens, getPasswordResetToken } from '@db/actions/passwordReset';
import { addEmailVerifyToken, deleteEmailVerifyTokens, getEmailVerifyToken } from '@db/actions/emailVerify';
import { getUserByID } from '@db/actions/user';

export async function replaceEmailVerifyToken(userId: number, tokenHash: string) {
	return await withTransaction(async (transaction) => {
		const user = await getUserByID(userId, transaction, true);
		if (!user) throw new Error('User not found while creating email verification token');
		if (user.emailVerified) return null;
		await deleteEmailVerifyTokens(userId, transaction);
		const token = await addEmailVerifyToken(userId, tokenHash, new Date(Date.now() + 36e5), transaction);
		if (!token) throw new Error('Failed to create email verification token');
		return token;
	});
}

export async function replacePasswordResetToken(userId: number, tokenHash: string) {
	await withTransaction(async (transaction) => {
		const user = await getUserByID(userId, transaction, true);
		if (!user) throw new Error('User not found while creating password reset token');
		await deletePasswordResetTokens(userId, transaction);
		await addPasswordResetToken(userId, tokenHash, new Date(Date.now() + 36e5), transaction);
	});
}

export function generateToken() {
	return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createEmailVerificationToken(userId: number) {
	const token = generateToken();
	const tokenHash = hashToken(token);

	const record = await replaceEmailVerifyToken(userId, tokenHash);

	return record ? token : null;
}

export async function createPasswordResetToken(userId: number) {
	const token = generateToken();
	const tokenHash = hashToken(token);

	await replacePasswordResetToken(userId, tokenHash);

	return token;
}

type TVerifyResult =
	| { status: 'invalid-token' }
	| { status: 'expired-token'; userId: number }
	| { status: 'valid-token'; userId: number };

export async function verifyEmailVerifyToken(token: string): Promise<TVerifyResult> {
	const tokenHash = hashToken(token);
	const record = await getEmailVerifyToken(tokenHash);

	if (!record) {
		return { status: 'invalid-token' };
	} else if (record.expiresAt < new Date()) {
		return { status: 'expired-token', userId: record.userId };
	}

	return { status: 'valid-token', userId: record.userId };
}

export async function verifyResetToken(token: string) {
	const tokenHash = hashToken(token);
	const record = await getPasswordResetToken(tokenHash);

	if (!record || record.expiresAt < new Date()) return null;

	return record;
}
