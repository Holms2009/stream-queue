import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEmailVerifyToken } from '@db/actions/emailVerify';
import { getUserByID, updateUser } from '@db/actions/user';
import { createEmailVerificationToken } from '@server/auth/tokens';
import { sendEmailVerifyLink } from '@server/email/actions/auth';
import { confirmEmail, resendEmailVerification } from '@server/auth/email-verification';
import { EMAIL_VERIFICATION } from '../../../mock/email-verification';

vi.mock('@db/actions/emailVerify', () => ({
	getEmailVerifyToken: vi.fn(),
	deleteEmailVerifyTokens: vi.fn()
}));
vi.mock('@db', () => ({ withTransaction: (callback: (tx: object) => unknown) => callback({}) }));
vi.mock('@db/actions/user', () => ({ getUserByID: vi.fn(), updateUser: vi.fn() }));
vi.mock('@server/auth/tokens', async (importOriginal) => ({
	...(await importOriginal<typeof import('@server/auth/tokens')>()),
	createEmailVerificationToken: vi.fn()
}));
vi.mock('@db/actions/passwordReset', () => ({ getPasswordResetToken: vi.fn() }));
vi.mock('@server/email/actions/auth', () => ({ sendEmailVerifyLink: vi.fn() }));

describe('confirmEmail', () => {
	it('передаёт хеш токена в действие БД и возвращает его результат', async () => {
		vi.mocked(getEmailVerifyToken).mockResolvedValue({ ...EMAIL_VERIFICATION.tokenRecord, expiresAt: new Date('2100-01-01') });
		vi.mocked(getUserByID).mockResolvedValue(EMAIL_VERIFICATION.account);

		const result = await confirmEmail(EMAIL_VERIFICATION.token);

		expect(getEmailVerifyToken).toHaveBeenCalledWith(EMAIL_VERIFICATION.tokenHash, expect.any(Object));
		expect(updateUser).toHaveBeenCalledWith(1, { emailVerified: true }, expect.any(Object));
		expect(result).toEqual({ status: 'success' });
	});
});

describe('resendEmailVerification', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('отправляет письмо на адрес неподтверждённого пользователя из БД', async () => {
		vi.mocked(getUserByID).mockResolvedValue(EMAIL_VERIFICATION.account);
		vi.mocked(createEmailVerificationToken).mockResolvedValue(EMAIL_VERIFICATION.token);

		await resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin);

		expect(createEmailVerificationToken).toHaveBeenCalledExactlyOnceWith(1);
		expect(sendEmailVerifyLink).toHaveBeenCalledExactlyOnceWith({
			email: 'user@example.com',
			token: expect.any(String),
			origin: 'http://localhost'
		});
	});

	it('не отправляет письмо, если пользователь не найден', async () => {
		vi.mocked(getUserByID).mockResolvedValue(null);

		await resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin);

		expect(createEmailVerificationToken).not.toHaveBeenCalled();
		expect(sendEmailVerifyLink).not.toHaveBeenCalled();
	});

	it('не отправляет письмо, если почта уже подтверждена', async () => {
		vi.mocked(getUserByID).mockResolvedValue({
			...EMAIL_VERIFICATION.account,
			emailVerified: true
		});

		await resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin);

		expect(createEmailVerificationToken).not.toHaveBeenCalled();
		expect(sendEmailVerifyLink).not.toHaveBeenCalled();
	});

	it('передаёт ошибку отправки вызывающему коду', async () => {
		vi.mocked(getUserByID).mockResolvedValue(EMAIL_VERIFICATION.account);
		vi.mocked(createEmailVerificationToken).mockResolvedValue(EMAIL_VERIFICATION.token);
		vi.mocked(sendEmailVerifyLink).mockRejectedValue(new Error(EMAIL_VERIFICATION.errorMessage));

		await expect(
			resendEmailVerification(EMAIL_VERIFICATION.account.id, EMAIL_VERIFICATION.origin)
		).rejects.toThrow(EMAIL_VERIFICATION.errorMessage);
	});
});
