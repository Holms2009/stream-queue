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
		const [queue] = await db.insert(queuesTable).values({ userId }).returning();
		queueId = queue.id;
	});

	afterEach(async () => {
		if (userId !== undefined) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});

	it('отклоняет отсутствующие связи', async () => {
		const request = {
			queueId,
			title: QUEUE.title,
			viewerName: QUEUE.viewerName,
			status: 'waiting' as const,
			position: 1
		};
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
