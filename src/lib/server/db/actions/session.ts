import { eq } from 'drizzle-orm';

import { db } from '@db';
import { sessionsTable } from '@db/schema';
import type { TDatabaseTransaction, TSession } from '@db/types';

export async function getSessionByID(sessionId: string) {
	const row = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

	return row.length ? row[0] : null;
}

export async function getSessionByUserID(userId: number) {
	const row = await db.select().from(sessionsTable).where(eq(sessionsTable.userId, userId));

	return row.length ? row[0] : null;
}

export async function addSession(sessionData: TSession): Promise<TSession | null> {
	const row = await db.insert(sessionsTable).values(sessionData).returning();

	return row.length ? row[0] : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
	await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
}

export async function deleteUserSessions(
	userId: number,
	transaction?: TDatabaseTransaction
): Promise<void> {
	await (transaction ?? db).delete(sessionsTable).where(eq(sessionsTable.userId, userId));
}

export async function updateSession(sessionId: string, expiresAt: Date): Promise<TSession | null> {
	const row = await db
		.update(sessionsTable)
		.set({ expiresAt })
		.where(eq(sessionsTable.id, sessionId))
		.returning();

	return row.length ? row[0] : null;
}
