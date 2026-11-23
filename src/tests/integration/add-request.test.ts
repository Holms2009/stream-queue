import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { addRequest } from '@db/actions/request';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { QUEUE } from '../mock/queue';
import { REGISTRATION } from '../mock/registration';

describe('добавление заказа в БД', () => {
	let userId: number | undefined;
	let otherUserId: number | undefined;
	let queueId: number;
	beforeEach(async () => {
		const url = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
			url.port !== '5433' ||
			url.pathname !== '/local'
		)
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		userId = undefined;
		otherUserId = undefined;
		const [user, other] = await db
			.insert(usersTable)
			.values([
				{
					email: `vitest-${randomUUID()}@example.com`,
					passwordHash: REGISTRATION.testPasswordHash
				},
				{ email: `vitest-${randomUUID()}@example.com`, passwordHash: REGISTRATION.testPasswordHash }
			])
			.returning();
		userId = user.id;
		otherUserId = other.id;
		const [queue] = await db.insert(queuesTable).values({ userId }).returning();
		queueId = queue.id;
	});
	afterEach(async () => {
		if (userId !== undefined) await db.delete(usersTable).where(eq(usersTable.id, userId));
		if (otherUserId !== undefined)
			await db.delete(usersTable).where(eq(usersTable.id, otherUserId));
	});
	it('добавляет в конец ожидающих независимо от позиций отложенных', async () => {
		await db
			.insert(requestsTable)
			.values({
				queueId,
				title: QUEUE.deferredTitle,
				viewerName: QUEUE.viewerName,
				status: 'deferred',
				position: 10
			});
		const data = { title: QUEUE.title, viewerName: QUEUE.viewerName };
		expect(await addRequest(userId!, queueId, data)).toBe(true);
		expect(await addRequest(userId!, queueId, data)).toBe(true);
		const rows = await db
			.select()
			.from(requestsTable)
			.where(eq(requestsTable.queueId, queueId))
			.orderBy(asc(requestsTable.id));
		expect(
			rows.filter(({ status }) => status === 'waiting').map(({ position }) => position)
		).toEqual([1, 2]);
		expect(rows.filter(({ status }) => status === 'waiting').map(({ title }) => title)).toEqual([
			QUEUE.title,
			QUEUE.title
		]);
	});
	it('при одновременном добавлении сохраняет разные последовательные позиции', async () => {
		const data = { title: QUEUE.title, viewerName: QUEUE.viewerName };
		expect(
			await Promise.all([addRequest(userId!, queueId, data), addRequest(userId!, queueId, data)])
		).toEqual([true, true]);
		const rows = await db
			.select()
			.from(requestsTable)
			.where(eq(requestsTable.queueId, queueId))
			.orderBy(asc(requestsTable.position));
		expect(rows.map(({ position }) => position)).toEqual([1, 2]);
	});
	it('не добавляет заказ в чужую или несуществующую очередь', async () => {
		const data = { title: QUEUE.title, viewerName: QUEUE.viewerName };
		expect(await addRequest(otherUserId!, queueId, data)).toBe(false);
		expect(await addRequest(userId!, QUEUE.missingId, data)).toBe(false);
		expect(
			await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId))
		).toHaveLength(0);
	});
});
