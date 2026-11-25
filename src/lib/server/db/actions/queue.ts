import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@db';
import { queuesTable, requestsTable } from '@db/schema';
import type { TDatabaseTransaction } from '@db/types';

export async function addQueue(userId: number, transaction?: TDatabaseTransaction) {
	const [queue] = await (transaction ?? db).insert(queuesTable).values({ userId }).returning();
	return queue ?? null;
}

export async function getQueue(
	userId: number,
	queueId: number,
	transaction?: TDatabaseTransaction,
	forUpdate = false
): Promise<typeof queuesTable.$inferSelect | null> {
	const query = (transaction ?? db)
		.select()
		.from(queuesTable)
		.where(and(eq(queuesTable.id, queueId), eq(queuesTable.userId, userId)));

	const [queue] = await (forUpdate ? query.for('update') : query);

	return queue ?? null;
}

export async function getLatestQueue(userId: number, transaction?: TDatabaseTransaction) {
	const [queue] = await (transaction ?? db)
		.select({ id: queuesTable.id, createdAt: queuesTable.createdAt })
		.from(queuesTable)
		.where(eq(queuesTable.userId, userId))
		.orderBy(desc(queuesTable.createdAt), desc(queuesTable.id))
		.limit(1);

	return queue ?? null;
}

export async function getQueueRequests(
	userId: number,
	queueId: number,
	transaction?: TDatabaseTransaction
) {
	return await (transaction ?? db)
		.select({
			id: requestsTable.id,
			title: requestsTable.title,
			viewerName: requestsTable.viewerName,
			description: requestsTable.description,
			status: requestsTable.status,
			position: requestsTable.position
		})
		.from(requestsTable)
		.innerJoin(queuesTable, eq(requestsTable.queueId, queuesTable.id))
		.where(and(eq(queuesTable.id, queueId), eq(queuesTable.userId, userId)))
		.orderBy(asc(requestsTable.position), asc(requestsTable.id));
}

export async function getLatestQueueWithRequests(userId: number) {
	const queue = await getLatestQueue(userId);
	if (!queue) return null;
	const requests = await getQueueRequests(userId, queue.id);

	return { queue, requests };
}
