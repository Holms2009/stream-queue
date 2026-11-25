import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequest } from '@server/request';
import { actions } from '../../../routes/(protected)/+page.server';
import { QUEUE } from '../../mock/queue';
import { SESSION } from '../../mock/session';

vi.mock('@server/request', () => ({ createRequest: vi.fn() }));
vi.mock('@db/actions/queue', () => ({ getLatestQueueWithRequests: vi.fn() }));
vi.mock('@db/actions/session', () => ({ deleteSession: vi.fn() }));
vi.mock('@server/auth/session', () => ({ deleteSessionTokenCookie: vi.fn() }));

function actionEvent(queueId: string | null = String(QUEUE.queueId), title = QUEUE.title) {
	const form = new FormData();
	if (queueId !== null) form.set('queueId', queueId);
	form.set('title', title);
	form.set('viewerName', QUEUE.viewerName);
	return {
		locals: {
			session: { id: SESSION.id, userId: SESSION.user.userId, expiresAt: SESSION.renewedExpiry }
		},
		request: new Request('http://localhost/', { method: 'POST', body: form })
	} as Parameters<typeof actions.addRequest>[0];
}

describe('action добавления заказа', () => {
	beforeEach(() => vi.resetAllMocks());
	it('передаёт пользователя из сессии и данные формы', async () => {
		vi.mocked(createRequest).mockResolvedValue({ success: true });
		expect(await actions.addRequest(actionEvent())).toEqual({ status: 'success' });
		expect(createRequest).toHaveBeenCalledExactlyOnceWith({
			userId: SESSION.user.userId,
			queueId: QUEUE.queueId,
			input: { title: QUEUE.title, viewerName: QUEUE.viewerName }
		});
	});
	it.each(QUEUE.invalidIds)('отклоняет некорректный ID очереди %s', async (queueId) => {
		expect(await actions.addRequest(actionEvent(queueId === null ? null : String(queueId)))).toMatchObject({ status: 404 });
		expect(createRequest).not.toHaveBeenCalled();
	});
	it('возвращает ошибки полей при некорректных полях и ID очереди', async () => {
		expect(await actions.addRequest(actionEvent('0', ''))).toMatchObject({
			status: 400,
			data: { status: 'invalid', errors: QUEUE.invalidErrors }
		});
		expect(createRequest).not.toHaveBeenCalled();
	});
	it('возвращает ошибки полей в общем формате', async () => {
		vi.mocked(createRequest).mockResolvedValue({
			success: false,
			reason: 'invalid',
			errors: QUEUE.invalidErrors
		});
		expect(await actions.addRequest(actionEvent())).toMatchObject({
			status: 400,
			data: { status: 'invalid', errors: QUEUE.invalidErrors }
		});
	});
	it('возвращает общую ошибку для недоступной очереди', async () => {
		vi.mocked(createRequest).mockResolvedValue({ success: false, reason: 'queue-not-found' });
		expect(await actions.addRequest(actionEvent())).toMatchObject({
			status: 404,
			data: {
				status: 'error',
				errors: { formErrors: ['Очередь не найдена. Обновите страницу.'], fieldErrors: {} }
			}
		});
	});
	it('возвращает общую ошибку при сбое сохранения', async () => {
		vi.mocked(createRequest).mockRejectedValue(new Error(SESSION.databaseError));
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			expect(await actions.addRequest(actionEvent())).toMatchObject({
				status: 500,
				data: { status: 'error', errors: { formErrors: [QUEUE.formError], fieldErrors: {} } }
			});
		} finally {
			log.mockRestore();
		}
	});
});
