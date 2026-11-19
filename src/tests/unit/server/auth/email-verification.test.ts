import { beforeEach, describe, expect, it, vi } from 'vitest';

import { confirmEmailByTokenHash, replaceEmailVerifyToken } from '@db/actions/emailVerify';
import { getUserByID } from '@db/actions/user';
import { sendEmailVerifyLink } from '@server/email/actions/auth';
import { confirmEmail, resendEmailVerification } from '@server/auth/email-verification';
import { EMAIL_VERIFICATION } from '../../../mock/email-verification';

vi.mock('@db/actions/emailVerify', () => ({
	addEmailVerifyToken: vi.fn(),
	getEmailVerifyToken: vi.fn(),
	replaceEmailVerifyToken: vi.fn(),
	confirmEmailByTokenHash: vi.fn()
}));
vi.mock('@db/actions/user', () => ({ getUserByID: vi.fn() }));
vi.mock('@db/actions/passwordReset', () => ({ getPasswordResetToken: vi.fn() }));
vi.mock('@server/email/actions/auth', () => ({ sendEmailVerifyLink: vi.fn() }));

describe('confirmEmail', () => {
	it('передаёт хеш токена в действие БД и возвращает его результат', async () => {
		vi.mocked(confirmEmailByTokenHash).mockResolvedValue({ status: 'success' });

		const result = await confirmEmail(EMAIL_VERIFICATION.token);

		expect(confirmEmailByTokenHash).toHaveBeenCalledExactlyOnceWith(EMAIL_VERIFICATION.tokenHash);
		expect(result).toEqual({ status: 'success' });
	});
});

describe('resendEmailVerification', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('отправляет письмо на адрес неподтверждённого пользователя из БД', async () => {
		vi.mocked(getUserByID).mockResolvedValue(EMAIL_VERIFICATION.account);
		vi.mocked(replaceEmailVerifyToken).mockResolvedValue(EMAIL_VERIFICATION.tokenRecord);

		await resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin);

		expect(replaceEmailVerifyToken).toHaveBeenCalledExactlyOnceWith(1, expect.any(String));
		expect(sendEmailVerifyLink).toHaveBeenCalledExactlyOnceWith({
			email: 'user@example.com',
			token: expect.any(String),
			origin: 'http://localhost'
		});
	});

	it('не отправляет письмо, если пользователь не найден', async () => {
		vi.mocked(getUserByID).mockResolvedValue(null);

		await resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin);

		expect(replaceEmailVerifyToken).not.toHaveBeenCalled();
		expect(sendEmailVerifyLink).not.toHaveBeenCalled();
	});

	it('не отправляет письмо, если почта уже подтверждена', async () => {
		vi.mocked(getUserByID).mockResolvedValue({
			...EMAIL_VERIFICATION.account,
			emailVerified: true
		});

		await resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin);

		expect(replaceEmailVerifyToken).not.toHaveBeenCalled();
		expect(sendEmailVerifyLink).not.toHaveBeenCalled();
	});

	it('передаёт ошибку отправки вызывающему коду', async () => {
		vi.mocked(getUserByID).mockResolvedValue(EMAIL_VERIFICATION.account);
		vi.mocked(replaceEmailVerifyToken).mockResolvedValue(EMAIL_VERIFICATION.tokenRecord);
		vi.mocked(sendEmailVerifyLink).mockRejectedValue(new Error(EMAIL_VERIFICATION.errorMessage));

		await expect(
			resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin)
		).rejects.toThrow(EMAIL_VERIFICATION.errorMessage);
	});
});
