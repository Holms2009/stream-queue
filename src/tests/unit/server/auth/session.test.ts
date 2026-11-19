import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteSession, getSessionByID, updateSession } from '@db/actions/session';
import { validateSessionToken } from '@server/auth/session';
import { SESSION } from '../../../mock/session';

vi.mock('@db/actions/session', () => ({
	addSession: vi.fn(),
	deleteSession: vi.fn(),
	getSessionByID: vi.fn(),
	updateSession: vi.fn()
}));

describe('validateSessionToken', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(SESSION.now);
	});

	afterEach(() => vi.useRealTimers());

	it('удаляет истёкшую сессию и возвращает null', async () => {
		vi.mocked(getSessionByID).mockResolvedValue({
			id: SESSION.id,
			userId: 15,
			expiresAt: SESSION.expiredAt
		});

		const result = await validateSessionToken(SESSION.token);

		expect(getSessionByID).toHaveBeenCalledExactlyOnceWith(SESSION.id);
		expect(deleteSession).toHaveBeenCalledExactlyOnceWith(SESSION.id);
		expect(result).toBeNull();
	});

	it('продлевает сессию и возвращает обновлённую запись', async () => {
		vi.mocked(getSessionByID).mockResolvedValue({
			id: SESSION.id,
			userId: 15,
			expiresAt: SESSION.nearExpiry
		});
		const updated = { id: SESSION.id, userId: 15, expiresAt: SESSION.renewedExpiry };
		vi.mocked(updateSession).mockResolvedValue(updated);

		const result = await validateSessionToken(SESSION.token);

		expect(updateSession).toHaveBeenCalledExactlyOnceWith(SESSION.id, SESSION.renewedExpiry);
		expect(result).toEqual(updated);
	});

	it('возвращает null, если сессию удалили до продления', async () => {
		vi.mocked(getSessionByID).mockResolvedValue({
			id: SESSION.id,
			userId: 15,
			expiresAt: SESSION.nearExpiry
		});
		vi.mocked(updateSession).mockResolvedValue(null);

		const result = await validateSessionToken(SESSION.token);

		expect(updateSession).toHaveBeenCalledExactlyOnceWith(SESSION.id, SESSION.renewedExpiry);
		expect(result).toBeNull();
	});
});
