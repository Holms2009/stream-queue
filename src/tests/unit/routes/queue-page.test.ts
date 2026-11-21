import { describe, expect, it, vi } from 'vitest';
import { getLatestQueueWithRequests } from '@db/actions/queue';
import { load } from '../../../routes/(protected)/+page.server';
import { SESSION } from '../../mock/session';

vi.mock('@db/actions/queue', () => ({ getLatestQueueWithRequests: vi.fn() }));
vi.mock('@db/actions/session', () => ({ deleteSession: vi.fn() }));
vi.mock('@server/auth/session', () => ({ deleteSessionTokenCookie: vi.fn() }));

describe('загрузка главной страницы', () => {
	it('возвращает ошибку, если очередь пользователя отсутствует', async () => {
		vi.mocked(getLatestQueueWithRequests).mockResolvedValue(null);
		const event = {
			locals: {
				session: { id: SESSION.id, userId: SESSION.user.userId, expiresAt: SESSION.renewedExpiry }
			}
		} as Parameters<typeof load>[0];
		await expect(load(event)).rejects.toMatchObject({ status: 500 });
		expect(getLatestQueueWithRequests).toHaveBeenCalledExactlyOnceWith(SESSION.user.userId);
	});
});
