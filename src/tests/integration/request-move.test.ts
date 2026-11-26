import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { moveRequest } from '@server/request';
import { REGISTRATION } from '../mock/registration';

describe('сохранение порядка заказов', () => {
	let userIds: number[];
	let queueId: number;
	let ids: number[];

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
		const rows = await db.insert(requestsTable).values([
			{ queueId, title: 'Ожидающий 1', viewerName: 'Зритель', status: 'waiting', position: 1 },
			{ queueId, title: 'Ожидающий 2', viewerName: 'Зритель', status: 'waiting', position: 2 },
			{ queueId, title: 'Отложенный 1', viewerName: 'Зритель', status: 'deferred', position: 1 },
			{ queueId, title: 'Отложенный 2', viewerName: 'Зритель', status: 'deferred', position: 2 }
		]).returning();
		ids = rows.map((row) => row.id);
	});

	afterEach(async () => {
		for (const id of userIds) await db.delete(usersTable).where(eq(usersTable.id, id));
	});

	async function positions() {
		const rows = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		return ids.map((id) => rows.find((row) => row.id === id)?.position);
	}

	it.each([
		[0, [2, 1, 1, 2]],
		[2, [1, 2, 2, 1]]
	])('перемещает заказ %i только в своей группе', async (index, expected) => {
		expect(await moveRequest(userIds[0], queueId, ids[index], 2)).toBe(true);
		expect(await positions()).toEqual(expected);
	});

	it('не меняет данные чужой очереди', async () => {
		expect(await moveRequest(userIds[1], queueId, ids[0], 2)).toBe(false);
		expect(await positions()).toEqual([1, 2, 1, 2]);
	});
	it('не меняет данные при отсутствующем заказе', async () => {
		expect(await moveRequest(userIds[0], queueId, 2_147_483_647, 2)).toBe(false);
		expect(await positions()).toEqual([1, 2, 1, 2]);
	});
	it('не меняет данные при позиции за пределами группы', async () => {
		expect(await moveRequest(userIds[0], queueId, ids[0], 3)).toBe(false);
		expect(await positions()).toEqual([1, 2, 1, 2]);
	});
});
