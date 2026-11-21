import { eq } from 'drizzle-orm';

import { db } from '@db';
import { usersTable, usersDataTable } from '@db/schema';
import type { TDatabaseTransaction, TUser, TUserData } from '@db/types';
import { addQueue } from './queue';

export async function getUserByID(userId: number) {
	const row = await db.select().from(usersTable).where(eq(usersTable.id, userId));

	return row.length ? row[0] : null;
}

export async function getUserByEmail(email: string) {
	const row = await db.select().from(usersTable).where(eq(usersTable.email, email));

	return row.length ? row[0] : null;
}

export async function addUser(
	email: string,
	passwordHash: string,
	transaction?: TDatabaseTransaction
) {
	const row = await (transaction ?? db)
		.insert(usersTable)
		.values({
			email,
			passwordHash
		})
		.onConflictDoNothing({ target: usersTable.email })
		.returning();

	return row.length ? row[0] : null;
}

export async function updateUser(userId: number, fields: Partial<TUser>): Promise<void> {
	await db
		.update(usersTable)
		.set({ ...fields })
		.where(eq(usersTable.id, userId));
}

export async function getUserDataByUserId(userId: number): Promise<TUserData | null> {
	const row = await db
		.select({
			id: usersDataTable.id,
			userId: usersDataTable.userId,
			email: usersTable.email,
			emailVerified: usersTable.emailVerified,
			displayName: usersDataTable.displayName,
			avatar: usersDataTable.avatar,
			createdAt: usersDataTable.createdAt
		})
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.innerJoin(usersDataTable, eq(usersTable.id, usersDataTable.userId));

	return row.length ? row[0] : null;
}

export async function getUserDataByEmail(email: string): Promise<TUserData | null> {
	const row = await db
		.select({
			id: usersDataTable.id,
			userId: usersDataTable.userId,
			email: usersTable.email,
			emailVerified: usersTable.emailVerified,
			displayName: usersDataTable.displayName,
			avatar: usersDataTable.avatar,
			createdAt: usersDataTable.createdAt
		})
		.from(usersTable)
		.where(eq(usersTable.email, email))
		.innerJoin(usersDataTable, eq(usersTable.id, usersDataTable.userId));

	return row.length ? row[0] : null;
}

export async function addUserData(userId: number, transaction?: TDatabaseTransaction) {
	const row = await (transaction ?? db).insert(usersDataTable).values({ userId }).returning();

	return row.length ? row[0] : null;
}

export async function addUserWithData(email: string, passwordHash: string) {
	return await db.transaction(async (transaction) => {
		const user = await addUser(email, passwordHash, transaction);

		if (!user) return null;

		const userData = await addUserData(user.id, transaction);

		if (!userData) throw new Error('Unexpected error while adding user data');

		const queue = await addQueue(user.id, transaction);
		if (!queue) throw new Error('Unexpected error while adding initial queue');

		return user.id;
	});
}

export async function updateUserData(
	userId: number,
	userFields: Partial<TUser>,
	userDataFields: Partial<TUserData>
) {
	await db.transaction(async (tx) => {
		if (Object.keys(userFields).length) {
			await tx.update(usersTable).set(userFields).where(eq(usersTable.id, userId));
		}

		if (Object.keys(userDataFields).length) {
			await tx.update(usersDataTable).set(userDataFields).where(eq(usersDataTable.userId, userId));
		}
	});
}
