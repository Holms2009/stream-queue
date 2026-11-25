import { and, eq, gt } from 'drizzle-orm';

import { db } from '@db';
import { passwordResetTokens } from '@db/schema';
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
	expiresAt: Date,
	transaction?: TDatabaseTransaction
) {
	await (transaction ?? db).insert(passwordResetTokens).values({
		userId,
		tokenHash,
		expiresAt
	});
}

export async function getPasswordResetToken(
	tokenHash: string,
	transaction?: TDatabaseTransaction
): Promise<typeof passwordResetTokens.$inferSelect | null> {
	const [record] = await (transaction ?? db)
		.select()
		.from(passwordResetTokens)
		.where(eq(passwordResetTokens.tokenHash, tokenHash))
		.limit(1);

	return record ?? null;
}

export async function consumePasswordResetToken(
	userId: number,
	tokenHash: string,
	transaction?: TDatabaseTransaction
) {
	const [token] = await (transaction ?? db)
		.delete(passwordResetTokens)
		.where(
			and(
				eq(passwordResetTokens.userId, userId),
				eq(passwordResetTokens.tokenHash, tokenHash),
				gt(passwordResetTokens.expiresAt, new Date())
			)
		)
		.returning({ id: passwordResetTokens.id });
	return token ?? null;
}

