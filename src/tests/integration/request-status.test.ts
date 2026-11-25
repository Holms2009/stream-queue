import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { changeRequestStatus } from '@server/request';
import { QUEUE } from '../mock/queue';
import { REGISTRATION } from '../mock/registration';

describe('изменение статуса заказа', () => {
	let userIds: number[] = [];
	let queueId: number;
	let requestId: number;
	beforeEach(async () => {
		userIds = [];
		const url = new URL(DATABASE_URL);
		if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || url.port !== '5433' || url.pathname !== '/local')
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		for (let i = 0; i < 2; i++) {
			const [user] = await db.insert(usersTable).values({ email: `vitest-${randomUUID()}@example.com`, passwordHash: REGISTRATION.testPasswordHash }).returning();
			userIds.push(user.id);
		}
		const [queue] = await db.insert(queuesTable).values({ userId: userIds[0] }).returning();
		queueId = queue.id;
		const [request] = await db.insert(requestsTable).values({ queueId, title: QUEUE.waitingTitle, viewerName: QUEUE.viewerName, status: 'waiting', position: 1 }).returning();
		requestId = request.id;
	});
	afterEach(async () => {
		for (const id of userIds) await db.delete(usersTable).where(eq(usersTable.id, id));
	});
	it.each(QUEUE.removalActions)('не меняет заказ в чужой очереди при статусе $status', async ({ status }) => {
		expect(await changeRequestStatus({ userId: userIds[1], queueId, requestId, status })).toEqual({ success: false });
		const [row] = await db.select().from(requestsTable).where(eq(requestsTable.id, requestId));
		expect(row).toMatchObject({ status: 'waiting', position: 1 });
	});
});
