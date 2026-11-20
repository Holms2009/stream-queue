import { describe, expect, it, vi } from 'vitest';

import { replacePasswordResetToken } from '@db/actions/passwordReset';
import { createPasswordResetToken, hashToken } from '@server/auth/tokens';
import { PASSWORD_RESET } from '../../../mock/password-reset';

vi.mock('@db/actions/passwordReset', () => ({
	replacePasswordResetToken: vi.fn(),
	getPasswordResetToken: vi.fn()
}));
vi.mock('@db/actions/emailVerify', () => ({
	getEmailVerifyToken: vi.fn(),
	replaceEmailVerifyToken: vi.fn()
}));

describe('createPasswordResetToken', () => {
	it('возвращает исходный токен и передаёт в БД его хеш', async () => {
		const token = await createPasswordResetToken(PASSWORD_RESET.userId);

		expect(token).toEqual(expect.any(String));
		expect(token).not.toBe(hashToken(token));
		expect(replacePasswordResetToken).toHaveBeenCalledExactlyOnceWith(
			PASSWORD_RESET.userId,
			hashToken(token)
		);
	});
});
