import { db } from '@db';
import { queuesTable } from '@db/schema';
import type { TDatabaseTransaction } from '@db/types';

export async function addQueue(userId: number, transaction?: TDatabaseTransaction) {
	const [queue] = await (transaction ?? db).insert(queuesTable).values({ userId }).returning();
	return queue ?? null;
}
