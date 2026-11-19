import { eq } from 'drizzle-orm';

import { db } from '@db';
import { emailVerifyTokensTable, usersTable } from '@db/schema';
import type { TDatabaseTransaction } from '@db/types';

export async function deleteEmailVerifyTokens(userId: number, transaction?: TDatabaseTransaction) {
	await (transaction ?? db)
		.delete(emailVerifyTokensTable)
		.where(eq(emailVerifyTokensTable.userId, userId));
}

export async function addEmailVerifyToken(
	userId: number,
	tokenHash: string,
	transaction?: TDatabaseTransaction
) {
	const [row] = await (transaction ?? db)
		.insert(emailVerifyTokensTable)
		.values({
			userId,
			tokenHash,
			expiresAt: new Date(Date.now() + 36e5)
		})
		.returning();

	return row || null;
}

export async function getEmailVerifyToken(tokenHash: string) {
	const [record] = await db
		.select()
		.from(emailVerifyTokensTable)
		.where(eq(emailVerifyTokensTable.tokenHash, tokenHash))
		.limit(1);

	return record ?? null;
}

export async function replaceEmailVerifyToken(userId: number, tokenHash: string) {
	return await db.transaction(async (transaction) => {
		const [user] = await transaction
			.select({ id: usersTable.id, emailVerified: usersTable.emailVerified })
			.from(usersTable)
			.where(eq(usersTable.id, userId))
			.for('update');

		if (!user) throw new Error('User not found while creating email verification token');
		if (user.emailVerified) return null;

		await deleteEmailVerifyTokens(userId, transaction);
		const token = await addEmailVerifyToken(userId, tokenHash, transaction);
		if (!token) throw new Error('Failed to create email verification token');

		return token;
	});
}

export async function confirmEmailByTokenHash(tokenHash: string) {
	return await db.transaction(async (transaction) => {
		const [foundToken] = await transaction
			.select({ userId: emailVerifyTokensTable.userId })
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.tokenHash, tokenHash))
			.limit(1);

		if (!foundToken) return { status: 'invalid-token' as const };

		const [user] = await transaction
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(eq(usersTable.id, foundToken.userId))
			.for('update');

		if (!user) return { status: 'invalid-token' as const };

		const [token] = await transaction
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.tokenHash, tokenHash))
			.limit(1)
			.for('update');

		if (!token) return { status: 'invalid-token' as const };
		if (token.expiresAt <= new Date()) return { status: 'expired-token' as const };

		await transaction
			.update(usersTable)
			.set({ emailVerified: true })
			.where(eq(usersTable.id, token.userId));

		await transaction
			.delete(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, token.userId));

		return { status: 'success' as const };
	});
}
