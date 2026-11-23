import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addRequest } from '@db/actions/request';
import { createRequest } from '@server/request';
import { QUEUE } from '../../mock/queue';

vi.mock('@db/actions/request', () => ({ addRequest: vi.fn() }));

describe('создание заказа', () => {
	beforeEach(() => vi.resetAllMocks());
	it('удаляет пробелы по краям и передаёт данные в БД', async () => {
		vi.mocked(addRequest).mockResolvedValue(true);
		expect(
			await createRequest({
				userId: QUEUE.userId,
				queueId: QUEUE.queueId,
				input: QUEUE.requestInput
			})
		).toEqual({ success: true });
		expect(addRequest).toHaveBeenCalledExactlyOnceWith(QUEUE.userId, QUEUE.queueId, {
			title: QUEUE.title,
			viewerName: QUEUE.viewerName
		});
	});
	it.each([
		{ title: '', viewerName: QUEUE.viewerName, field: 'title' },
		{ title: QUEUE.tooLongTitle, viewerName: QUEUE.viewerName, field: 'title' },
		{ title: QUEUE.title, viewerName: ' ', field: 'viewerName' },
		{ title: QUEUE.title, viewerName: QUEUE.tooLongViewerName, field: 'viewerName' }
	])('возвращает ошибку для поля $field', async ({ title, viewerName, field }) => {
		const result = await createRequest({
			userId: QUEUE.userId,
			queueId: QUEUE.queueId,
			input: { title, viewerName }
		});
		if (result.success || result.reason !== 'invalid') throw new Error('Ожидалась ошибка поля');
		expect(result.errors.fieldErrors[field]).toBeDefined();
		expect(addRequest).not.toHaveBeenCalled();
	});
	it('возвращает ошибку для недоступной очереди', async () => {
		vi.mocked(addRequest).mockResolvedValue(false);
		expect(
			await createRequest({
				userId: QUEUE.userId,
				queueId: QUEUE.queueId,
				input: QUEUE.requestInput
			})
		).toEqual({ success: false, reason: 'queue-not-found' });
	});
});
