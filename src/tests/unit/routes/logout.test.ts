import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteSession } from '@db/actions/session';
import { deleteSessionTokenCookie } from '@server/auth/session';
import { actions } from '../../../routes/(protected)/+page.server';
import { SESSION } from '../../mock/session';

vi.mock('@db/actions/session', () => ({ deleteSession: vi.fn() }));
vi.mock('@server/auth/session', () => ({ deleteSessionTokenCookie: vi.fn() }));

function createEvent() {
	return {
		locals: {
			session: { id: SESSION.id, userId: SESSION.user.userId, expiresAt: SESSION.renewedExpiry }
		}
	} as unknown as Parameters<typeof actions.logout>[0];
}

describe('выход из аккаунта', () => {
	beforeEach(() => vi.resetAllMocks());

	it('удаляет текущую сессию, очищает cookie и перенаправляет на страницу входа', async () => {
		const event = createEvent();

		await expect(actions.logout(event)).rejects.toMatchObject({ status: 303, location: '/login' });

		expect(deleteSession).toHaveBeenCalledExactlyOnceWith(SESSION.id);
		expect(deleteSessionTokenCookie).toHaveBeenCalledExactlyOnceWith(event);
		expect(vi.mocked(deleteSession).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(deleteSessionTokenCookie).mock.invocationCallOrder[0]
		);
	});

	it('возвращает ошибку и сохраняет cookie при сбое удаления сессии', async () => {
		vi.mocked(deleteSession).mockRejectedValue(new Error(SESSION.databaseError));
		const event = createEvent();

		expect(await actions.logout(event)).toMatchObject({
			status: 500,
			data: { error: 'Не удалось выйти. Попробуйте позже.' }
		});
		expect(deleteSession).toHaveBeenCalledExactlyOnceWith(SESSION.id);
		expect(deleteSessionTokenCookie).not.toHaveBeenCalled();
	});
});
