import { eq } from 'drizzle-orm';

import { db } from '@db';
import { usersTable, usersDataTable } from '@db/schema';
import type { TDatabaseTransaction, TUser, TUserData } from '@db/types';

export async function getUserByID(
	userId: number,
	transaction?: TDatabaseTransaction,
	forUpdate = false
) {
	const query = (transaction ?? db).select().from(usersTable).where(eq(usersTable.id, userId));
	const row = await (forUpdate ? query.for('update') : query);

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

export async function updateUser(
	userId: number,
	fields: Partial<TUser>,
	transaction?: TDatabaseTransaction
): Promise<void> {
	await (transaction ?? db)
		.update(usersTable)
		.set({ ...fields })
		.where(eq(usersTable.id, userId));
}

async function getUserData(condition: ReturnType<typeof eq>): Promise<TUserData | null> {
	const [row] = await db
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
		.where(condition)
		.innerJoin(usersDataTable, eq(usersTable.id, usersDataTable.userId));
	return row ?? null;
}

export async function getUserDataByUserId(userId: number): Promise<TUserData | null> {
	return getUserData(eq(usersTable.id, userId));
}

export async function getUserDataByEmail(email: string): Promise<TUserData | null> {
	return getUserData(eq(usersTable.email, email));
}

export async function addUserData(userId: number, transaction?: TDatabaseTransaction) {
	const row = await (transaction ?? db).insert(usersDataTable).values({ userId }).returning();

	return row.length ? row[0] : null;
}

export async function updateProfile(
	userId: number,
	fields: Partial<TUserData>,
	transaction?: TDatabaseTransaction
) {
	await (transaction ?? db)
		.update(usersDataTable)
		.set(fields)
		.where(eq(usersDataTable.userId, userId));
}

export async function updateUserData(
	userId: number,
	userFields: Partial<TUser>,
	userDataFields: Partial<TUserData>
) {
	await db.transaction(async (tx) => {
		if (Object.keys(userFields).length) {
			await updateUser(userId, userFields, tx);
		}

		if (Object.keys(userDataFields).length) {
			await updateProfile(userId, userDataFields, tx);
		}
	});
}
