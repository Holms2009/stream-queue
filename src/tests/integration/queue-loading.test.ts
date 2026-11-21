import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { getLatestQueueWithRequests } from '@db/actions/queue';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { QUEUE } from '../mock/queue';
import { REGISTRATION } from '../mock/registration';

describe('загрузка очереди', () => {
	const userIds: number[] = [];
	beforeEach(async () => {
		const url = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
			url.port !== '5433' ||
			url.pathname !== '/local'
		)
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
	});
	afterEach(async () => {
		for (const id of userIds) await db.delete(usersTable).where(eq(usersTable.id, id));
		userIds.length = 0;
	});
	async function createUser() {
		const [user] = await db
			.insert(usersTable)
			.values({
				email: `vitest-${randomUUID()}@example.com`,
				passwordHash: REGISTRATION.testPasswordHash
			})
			.returning();
		userIds.push(user.id);
		return user.id;
	}
	it('выбирает последнюю очередь по дате и id и не возвращает чужие заказы', async () => {
		const userId = await createUser();
		const otherUserId = await createUser();
		const [old, previous, latest, other] = await db
			.insert(queuesTable)
			.values([
				{ userId, createdAt: QUEUE.olderDate },
				{ userId, createdAt: QUEUE.newerDate },
				{ userId, createdAt: QUEUE.newerDate },
				{ userId: otherUserId, createdAt: QUEUE.newerDate }
			])
			.returning();
		await db.insert(requestsTable).values([
			{
				queueId: old.id,
				title: QUEUE.completedTitle,
				viewerName: QUEUE.viewerName,
				status: 'waiting',
				position: 1
			},
			{
				queueId: previous.id,
				title: QUEUE.deferredTitle,
				viewerName: QUEUE.viewerName,
				status: 'waiting',
				position: 1
			},
			{
				queueId: latest.id,
				title: QUEUE.waitingTitle,
				viewerName: QUEUE.viewerName,
				status: 'waiting',
				position: 1
			},
			{
				queueId: other.id,
				title: QUEUE.activeTitle,
				viewerName: QUEUE.viewerName,
				status: 'waiting',
				position: 1
			}
		]);
		const result = await getLatestQueueWithRequests(userId);
		expect(result?.queue.id).toBe(latest.id);
		expect(result?.requests.map(({ title }) => title)).toEqual([QUEUE.waitingTitle]);
	});
	it('сортирует заказы по позиции и id при совпадении позиции', async () => {
		const userId = await createUser();
		const [queue] = await db.insert(queuesTable).values({ userId }).returning();
		const inserted = await db
			.insert(requestsTable)
			.values([
				{
					queueId: queue.id,
					title: QUEUE.deferredTitle,
					viewerName: QUEUE.viewerName,
					status: 'deferred',
					position: 2
				},
				{
					queueId: queue.id,
					title: QUEUE.waitingTitle,
					viewerName: QUEUE.viewerName,
					status: 'waiting',
					position: 1
				},
				{
					queueId: queue.id,
					title: QUEUE.activeTitle,
					viewerName: QUEUE.viewerName,
					status: 'waiting',
					position: 1
				}
			])
			.returning();
		const result = await getLatestQueueWithRequests(userId);
		expect(result?.requests.map(({ id }) => id)).toEqual([
			inserted[1].id,
			inserted[2].id,
			inserted[0].id
		]);
	});
});
