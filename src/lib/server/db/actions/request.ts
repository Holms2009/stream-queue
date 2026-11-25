import { and, eq, max } from 'drizzle-orm';

import { db } from '@db';
import { requestsTable } from '@db/schema';
import type { TDatabaseTransaction } from '@db/types';
export async function withRequestTransaction<T>(
	callback: (transaction: TDatabaseTransaction) => Promise<T>
) {
	return await db.transaction(callback);
}

export async function getRequest(
	requestId: number,
	queueId: number,
	transaction?: TDatabaseTransaction
) {
	const [request] = await (transaction ?? db)
		.select()
		.from(requestsTable)
		.where(and(eq(requestsTable.id, requestId), eq(requestsTable.queueId, queueId)));

	return request ?? null;
}

export async function getActiveRequest(queueId: number, transaction?: TDatabaseTransaction) {
	const [request] = await (transaction ?? db)
		.select()
		.from(requestsTable)
		.where(and(eq(requestsTable.queueId, queueId), eq(requestsTable.status, 'active')));

	return request ?? null;
}

export async function insertRequest(
	data: typeof requestsTable.$inferInsert,
	transaction?: TDatabaseTransaction
) {
	await (transaction ?? db).insert(requestsTable).values(data);
}

export async function updateRequest(
	requestId: number,
	data: Partial<typeof requestsTable.$inferInsert>,
	transaction?: TDatabaseTransaction
) {
	await (transaction ?? db).update(requestsTable).set(data).where(eq(requestsTable.id, requestId));
}

export async function getLastRequestPosition(
	queueId: number,
	status: 'waiting' | 'deferred',
	transaction?: TDatabaseTransaction
) {
	const [result] = await (transaction ?? db)
		.select({ position: max(requestsTable.position) })
		.from(requestsTable)
		.where(and(eq(requestsTable.queueId, queueId), eq(requestsTable.status, status)));

	return result.position;
}
