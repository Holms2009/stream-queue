import { eq } from 'drizzle-orm';

import { db } from '@db';
import { passwordResetTokens } from '@db/schema';

export async function deletePasswordResetTokens(userId: number) {
	await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
}

export async function addPasswordResetToken(userId: number, tokenHash: string) {
	await db.insert(passwordResetTokens).values({
		userId,
		tokenHash,
		expiresAt: new Date(Date.now() + 36e5)
	});
}

export async function getPasswordResetToken(tokenHash: string) {
	const [record] = await db
		.select()
		.from(passwordResetTokens)
		.where(eq(passwordResetTokens.tokenHash, tokenHash))
		.limit(1);

	return record ?? null;
}
