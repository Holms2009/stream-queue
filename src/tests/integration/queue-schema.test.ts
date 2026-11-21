import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { QUEUE } from '../mock/queue';
import { REGISTRATION } from '../mock/registration';

describe('схема очередей и заказов', () => {
	let userId: number | undefined;
	let queueId: number;
	let otherQueueId: number;

	beforeEach(async () => {
		const url = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
			url.port !== '5433' ||
			url.pathname !== '/local'
		) {
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		}
		userId = undefined;
		const [user] = await db
			.insert(usersTable)
			.values({
				email: `vitest-${randomUUID()}@example.com`,
				passwordHash: REGISTRATION.testPasswordHash
			})
			.returning();
		userId = user.id;
		const [queue, otherQueue] = await db
			.insert(queuesTable)
			.values([{ userId }, { userId }])
			.returning();
		queueId = queue.id;
		otherQueueId = otherQueue.id;
	});

	afterEach(async () => {
		if (userId !== undefined) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});

	it('разрешает не более одного активного заказа в каждой очереди', async () => {
		const request = { title: QUEUE.title, viewerName: QUEUE.viewerName, status: 'active' as const };
		await db.insert(requestsTable).values({ ...request, queueId });
		await expect(db.insert(requestsTable).values({ ...request, queueId })).rejects.toThrow();
		await db.insert(requestsTable).values({ ...request, queueId: otherQueueId });
		const requests = await db
			.select()
			.from(requestsTable)
			.where(eq(requestsTable.queueId, otherQueueId));
		expect(requests).toHaveLength(1);
	});

	it('требует положительную позицию для ожидающих и отложенных заказов', async () => {
		for (const status of QUEUE.statusesWithPosition) {
			const request = { queueId, title: QUEUE.title, viewerName: QUEUE.viewerName, status };
			await db.insert(requestsTable).values({ ...request, position: 1 });
			await expect(
				db.insert(requestsTable).values({ ...request, position: null })
			).rejects.toThrow();
			await expect(db.insert(requestsTable).values({ ...request, position: 0 })).rejects.toThrow();
		}
		const requests = await db
			.select()
			.from(requestsTable)
			.where(eq(requestsTable.queueId, queueId));
		expect(requests).toHaveLength(2);
	});

	it('не допускает позицию для остальных статусов', async () => {
		for (const status of QUEUE.statusesWithoutPosition) {
			const request = { queueId, title: QUEUE.title, viewerName: QUEUE.viewerName, status };
			await db.insert(requestsTable).values({ ...request, position: null });
			await expect(db.insert(requestsTable).values({ ...request, position: 1 })).rejects.toThrow();
		}
		const requests = await db
			.select()
			.from(requestsTable)
			.where(eq(requestsTable.queueId, queueId));
		expect(requests).toHaveLength(4);
	});

	it('отклоняет неизвестный статус и отсутствующие связи', async () => {
		const request = {
			queueId,
			title: QUEUE.title,
			viewerName: QUEUE.viewerName,
			status: 'waiting' as const,
			position: 1
		};
		await expect(
			db.insert(requestsTable).values({ ...request, status: QUEUE.invalidStatus as 'waiting' })
		).rejects.toThrow();
		await expect(
			db.insert(requestsTable).values({ ...request, queueId: QUEUE.missingId })
		).rejects.toThrow();
		await expect(db.insert(queuesTable).values({ userId: QUEUE.missingId })).rejects.toThrow();
	});

	it('сохраняет описание или его отсутствие', async () => {
		const request = {
			queueId,
			title: QUEUE.title,
			viewerName: QUEUE.viewerName,
			status: 'waiting' as const,
			position: 1
		};
		const inserted = await db
			.insert(requestsTable)
			.values([{ ...request, description: QUEUE.description }, request])
			.returning();
		expect(inserted.map((item) => item.description)).toEqual([QUEUE.description, null]);
	});
});
