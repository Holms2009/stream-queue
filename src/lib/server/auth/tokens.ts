import crypto from 'crypto';

import { getPasswordResetToken } from '@db/actions/passwordReset';
import { getEmailVerifyToken, replaceEmailVerifyToken } from '@db/actions/emailVerify';

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
