import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLastRequestPosition, insertRequest, withRequestTransaction } from '@db/actions/request';
import { getQueue } from '@db/actions/queue';
import type { TDatabaseTransaction } from '@db/types';
import { createRequest } from '@server/request';
import { QUEUE } from '../../mock/queue';

vi.mock('@db/actions/request', () => ({
	withRequestTransaction: vi.fn(),
	getLastRequestPosition: vi.fn(),
	insertRequest: vi.fn()
}));
vi.mock('@db/actions/queue', () => ({ getQueue: vi.fn() }));

const transaction = {} as TDatabaseTransaction;

describe('создание заказа', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(withRequestTransaction).mockImplementation(async (callback) => callback(transaction));
		vi.mocked(getQueue).mockResolvedValue({ id: QUEUE.queueId } as NonNullable<
			Awaited<ReturnType<typeof getQueue>>
		>);
		vi.mocked(getLastRequestPosition).mockResolvedValue(null);
	});
	it('удаляет пробелы по краям и передаёт данные в БД', async () => {
		expect(
			await createRequest({
				userId: QUEUE.userId,
				queueId: QUEUE.queueId,
				input: QUEUE.requestInput
			})
		).toEqual({ success: true });
		expect(insertRequest).toHaveBeenCalledExactlyOnceWith(
			{
				queueId: QUEUE.queueId,
				title: QUEUE.title,
				viewerName: QUEUE.viewerName,
				status: 'waiting',
				position: 1
			},
			transaction
		);
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
		expect(withRequestTransaction).not.toHaveBeenCalled();
	});
	it('возвращает ошибку для недоступной очереди', async () => {
		vi.mocked(getQueue).mockResolvedValue(null);
		expect(
			await createRequest({
				userId: QUEUE.userId,
				queueId: QUEUE.queueId,
				input: QUEUE.requestInput
			})
		).toEqual({ success: false, reason: 'queue-not-found' });
	});
});
