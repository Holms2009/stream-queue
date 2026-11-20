import { eq } from 'drizzle-orm';

import { db } from '@db';
import { passwordResetTokens, usersTable } from '@db/schema';
import type { TDatabaseTransaction } from '@db/types';

export async function deletePasswordResetTokens(
	userId: number,
	transaction?: TDatabaseTransaction
) {
	await (transaction ?? db)
		.delete(passwordResetTokens)
		.where(eq(passwordResetTokens.userId, userId));
}

export async function addPasswordResetToken(
	userId: number,
	tokenHash: string,
	transaction?: TDatabaseTransaction
) {
	await (transaction ?? db).insert(passwordResetTokens).values({
		userId,
		tokenHash,
		expiresAt: new Date(Date.now() + 36e5)
	});
}

export async function replacePasswordResetToken(userId: number, tokenHash: string) {
	await db.transaction(async (transaction) => {
		const [user] = await transaction
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(eq(usersTable.id, userId))
			.for('update');

		if (!user) throw new Error('User not found while creating password reset token');

		await deletePasswordResetTokens(userId, transaction);
		await addPasswordResetToken(userId, tokenHash, transaction);
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
