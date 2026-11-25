import { eq } from 'drizzle-orm';

import { db } from '@db';
import { emailVerifyTokensTable } from '@db/schema';
import type { TDatabaseTransaction } from '@db/types';

export async function deleteEmailVerifyTokens(userId: number, transaction?: TDatabaseTransaction) {
	await (transaction ?? db)
		.delete(emailVerifyTokensTable)
		.where(eq(emailVerifyTokensTable.userId, userId));
}

export async function addEmailVerifyToken(
	userId: number,
	tokenHash: string,
	expiresAt: Date,
	transaction?: TDatabaseTransaction
) {
	const [row] = await (transaction ?? db)
		.insert(emailVerifyTokensTable)
		.values({
			userId,
			tokenHash,
			expiresAt
		})
		.returning();

	return row || null;
}

export async function getEmailVerifyToken(
	tokenHash: string,
	transaction?: TDatabaseTransaction,
	forUpdate = false
) {
	const query = (transaction ?? db)
		.select()
		.from(emailVerifyTokensTable)
		.where(eq(emailVerifyTokensTable.tokenHash, tokenHash))
		.limit(1);
	const [record] = await (forUpdate ? query.for('update') : query);

	return record ?? null;
}

