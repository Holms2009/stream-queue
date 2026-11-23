import { and, eq, max } from 'drizzle-orm';

import { db } from '@db';
import { queuesTable, requestsTable } from '@db/schema';
import type { CreateRequestData } from '../../../utils/request/validation';

export async function addRequest(userId: number, queueId: number, data: CreateRequestData) {
	return await db.transaction(async (transaction) => {
		const [queue] = await transaction
			.select({ id: queuesTable.id })
			.from(queuesTable)
			.where(and(eq(queuesTable.id, queueId), eq(queuesTable.userId, userId)))
			.for('update');

		if (!queue) return false;

		const [result] = await transaction
			.select({ position: max(requestsTable.position) })
			.from(requestsTable)
			.where(and(eq(requestsTable.queueId, queue.id), eq(requestsTable.status, 'waiting')));

		await transaction.insert(requestsTable).values({
			queueId: queue.id,
			title: data.title,
			viewerName: data.viewerName,
			status: 'waiting',
			position: (result.position ?? 0) + 1
		});

		return true;
	});
}
