import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import * as requestActions from '@db/actions/request';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { activateRequest } from '@server/request';
import { QUEUE } from '../mock/queue';
import { REGISTRATION } from '../mock/registration';

describe('переключение заказа в БД', () => {
	let userId: number;
	let queueId: number;
	let activeId: number;
	let selectedId: number;
	beforeEach(async () => {
		const url = new URL(DATABASE_URL);
		if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || url.port !== '5433' || url.pathname !== '/local')
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		const [user] = await db.insert(usersTable).values({ email: `vitest-${randomUUID()}@example.com`, passwordHash: REGISTRATION.testPasswordHash }).returning();
		userId = user.id;
		const [queue] = await db.insert(queuesTable).values({ userId }).returning();
		queueId = queue.id;
		const rows = await db.insert(requestsTable).values([
			{ queueId, title: QUEUE.activeTitle, viewerName: QUEUE.viewerName, status: 'active' },
			{ queueId, title: QUEUE.waitingTitle, viewerName: QUEUE.viewerName, status: 'waiting', position: 1 },
			{ queueId, title: QUEUE.deferredTitle, viewerName: QUEUE.viewerName, status: 'deferred', position: QUEUE.deferredPosition }
		]).returning();
		activeId = rows[0].id; selectedId = rows[1].id;
	});
	afterEach(async () => {
		vi.restoreAllMocks();
		if (userId !== undefined) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});
	it.each(QUEUE.previousStatuses)('переводит активный в %s и включает выбранный', async (previousStatus) => {
		expect(await activateRequest({ userId, queueId, requestId: selectedId, previousStatus })).toEqual({ success: true });
		const rows = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		expect(rows.find((row) => row.id === activeId)).toMatchObject({ status: previousStatus, position: previousStatus === 'deferred' ? QUEUE.deferredPosition + 1 : null });
		expect(rows.find((row) => row.id === selectedId)).toMatchObject({ status: 'active', position: null });
	});
	it('откатывает изменение активного заказа при ошибке включения выбранного', async () => {
		const original = requestActions.updateRequest;
		vi.spyOn(requestActions, 'updateRequest').mockImplementation(async (...args) => {
			if (args[0] === selectedId) throw new Error(REGISTRATION.databaseErrorMessage);
			return original(...args);
		});
		await expect(activateRequest({ userId, queueId, requestId: selectedId, previousStatus: 'deferred' })).rejects.toThrow(REGISTRATION.databaseErrorMessage);
		const rows = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		expect(rows.find((row) => row.id === activeId)).toMatchObject({ status: 'active', position: null });
		expect(rows.find((row) => row.id === selectedId)).toMatchObject({ status: 'waiting', position: 1 });
	});
});
