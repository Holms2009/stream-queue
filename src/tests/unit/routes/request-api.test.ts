import { beforeEach, describe, expect, it, vi } from 'vitest';

import { activateRequest, changeRequestStatus, moveRequest } from '@server/request';
import { POST as activate } from '../../../routes/api/requests/activate/+server';
import { POST as changeStatus } from '../../../routes/api/requests/change-status/+server';
import { POST as move } from '../../../routes/api/requests/move/+server';
import { QUEUE } from '../../mock/queue';
import { SESSION } from '../../mock/session';

vi.mock('@server/request', () => ({ activateRequest: vi.fn(), changeRequestStatus: vi.fn(), moveRequest: vi.fn() }));

function event(input: object) {
	return {
		locals: { session: { id: SESSION.id, userId: SESSION.user.userId, expiresAt: SESSION.renewedExpiry } },
		request: new Request('http://localhost/', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(input)
		})
	} as Parameters<typeof activate>[0] & Parameters<typeof changeStatus>[0];
}

describe.each([
	{ handler: activate, operation: activateRequest },
	{ handler: changeStatus, operation: changeRequestStatus }
])('валидация идентификаторов в API', ({ handler, operation }) => {
	beforeEach(() => vi.resetAllMocks());

	it.each(QUEUE.invalidIds)('отклоняет некорректный ID очереди %s', async (queueId) => {
		const response = await handler(event({ queueId, requestId: QUEUE.queueId, status: 'completed' }));
		expect(response.status).toBe(400);
		expect(operation).not.toHaveBeenCalled();
	});
	it.each(QUEUE.invalidIds)('отклоняет некорректный ID заказа %s', async (requestId) => {
		const response = await handler(event({ queueId: QUEUE.queueId, requestId, status: 'completed' }));
		expect(response.status).toBe(400);
		expect(operation).not.toHaveBeenCalled();
	});
	it('отклоняет отсутствующие идентификаторы', async () => {
		const response = await handler(event({}));
		expect(response.status).toBe(400);
		expect(operation).not.toHaveBeenCalled();
	});
	it('передаёт корректные идентификаторы в серверную операцию', async () => {
		vi.mocked(operation).mockResolvedValue({ success: true });
		const response = await handler(event({ queueId: QUEUE.queueId, requestId: QUEUE.queueId, status: 'completed' }));
		expect(response.status).toBe(200);
		expect(operation).toHaveBeenCalledWith(expect.objectContaining({ queueId: QUEUE.queueId, requestId: QUEUE.queueId }));
	});
});

describe('перемещение заказа', () => {
	beforeEach(() => vi.resetAllMocks());
	const input = { queueId: 1, requestId: 2, position: 3 };
	it('передаёт данные авторизованного пользователя в операцию', async () => {
		vi.mocked(moveRequest).mockResolvedValue(true);
		expect((await move(event(input))).status).toBe(200);
		expect(moveRequest).toHaveBeenCalledWith(SESSION.user.userId, 1, 2, 3);
	});
	it('отклоняет запрос без сессии', async () => {
		const requestEvent = event(input);
		requestEvent.locals.session = null;
		expect((await move(requestEvent)).status).toBe(401);
		expect(moveRequest).not.toHaveBeenCalled();
	});
	it.each([0, -1, 1.5, null, 2_147_483_648])('отклоняет позицию %s', async (position) => {
		expect((await move(event({ ...input, position }))).status).toBe(400);
		expect(moveRequest).not.toHaveBeenCalled();
	});
	it('возвращает ошибку, если операция не выполнена', async () => {
		vi.mocked(moveRequest).mockResolvedValue(false);
		expect((await move(event(input))).status).toBe(400);
	});
	it('возвращает ошибку сервера при исключении', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(moveRequest).mockRejectedValue(new Error('DB'));
		expect((await move(event(input))).status).toBe(500);
		vi.restoreAllMocks();
	});
});

describe('включение заказа', () => {
	beforeEach(() => vi.resetAllMocks());
	it.each(QUEUE.previousStatuses)('передаёт статус %s активного заказа', async (previousStatus) => {
		vi.mocked(activateRequest).mockResolvedValue({ success: true });
		const response = await activate(event({ queueId: QUEUE.queueId, requestId: QUEUE.queueId, previousStatus }));
		expect(response.status).toBe(200);
		expect(activateRequest).toHaveBeenCalledWith({ userId: SESSION.user.userId, queueId: QUEUE.queueId, requestId: QUEUE.queueId, previousStatus });
	});
	it('отклоняет недопустимый статус активного заказа', async () => {
		const response = await activate(event({ queueId: QUEUE.queueId, requestId: QUEUE.queueId, previousStatus: QUEUE.invalidStatus }));
		expect(response.status).toBe(400);
		expect(activateRequest).not.toHaveBeenCalled();
	});
});

describe('изменение статуса заказа', () => {
	beforeEach(() => vi.resetAllMocks());
	it.each(QUEUE.removalActions)('передаёт статус $status сценарию', async ({ status }) => {
		vi.mocked(changeRequestStatus).mockResolvedValue({ success: true });
		const response = await changeStatus(event({ queueId: QUEUE.queueId, requestId: QUEUE.queueId, status }));
		expect(response.status).toBe(200);
		expect(changeRequestStatus).toHaveBeenCalledWith(expect.objectContaining({ status, queueId: QUEUE.queueId, requestId: QUEUE.queueId }));
	});
	it.each([QUEUE.invalidStatus, QUEUE.removedStatus])('отклоняет недопустимый статус %s', async (status) => {
		const response = await changeStatus(event({ queueId: QUEUE.queueId, requestId: QUEUE.queueId, status }));
		expect(response.status).toBe(400);
		expect(changeRequestStatus).not.toHaveBeenCalled();
	});
});
