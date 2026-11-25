import { describe, expect, it, vi } from 'vitest';

import { addPasswordResetToken } from '@db/actions/passwordReset';
import { getUserByID } from '@db/actions/user';
import { createPasswordResetToken, hashToken } from '@server/auth/tokens';
import { PASSWORD_RESET } from '../../../mock/password-reset';

vi.mock('@db/actions/passwordReset', () => ({
	addPasswordResetToken: vi.fn(),
	deletePasswordResetTokens: vi.fn(),
	getPasswordResetToken: vi.fn()
}));
vi.mock('@db', () => ({ withTransaction: (callback: (tx: object) => unknown) => callback({}) }));
vi.mock('@db/actions/user', () => ({ getUserByID: vi.fn() }));
vi.mock('@db/actions/emailVerify', () => ({
	getEmailVerifyToken: vi.fn()
}));

describe('createPasswordResetToken', () => {
	it('возвращает исходный токен и передаёт в БД его хеш', async () => {
		vi.mocked(getUserByID).mockResolvedValue(PASSWORD_RESET.account);
		const token = await createPasswordResetToken(PASSWORD_RESET.userId);

		expect(token).toEqual(expect.any(String));
		expect(token).not.toBe(hashToken(token));
		expect(addPasswordResetToken).toHaveBeenCalledExactlyOnceWith(
			PASSWORD_RESET.userId,
			hashToken(token),
			expect.any(Date),
			expect.any(Object)
		);
	});
});
