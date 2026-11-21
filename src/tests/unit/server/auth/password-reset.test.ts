import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetPasswordByTokenHash } from '@db/actions/passwordReset';
import { getUserByEmail } from '@db/actions/user';
import { requestPasswordReset, resetPassword } from '@server/auth/password-reset';
import { hashPassword } from '@server/auth/password';
import { createPasswordResetToken, hashToken } from '@server/auth/tokens';
import { sendResetPasswordLink } from '@server/email/actions/auth';
import { PASSWORD_RESET } from '../../../mock/password-reset';

vi.mock('@db/actions/passwordReset', () => ({ resetPasswordByTokenHash: vi.fn() }));
vi.mock('@server/auth/password', () => ({ hashPassword: vi.fn() }));
vi.mock('@db/actions/user', () => ({ getUserByEmail: vi.fn() }));
vi.mock('@server/auth/tokens', () => ({ createPasswordResetToken: vi.fn(), hashToken: vi.fn() }));
vi.mock('@server/email/actions/auth', () => ({ sendResetPasswordLink: vi.fn() }));

describe('requestPasswordReset', () => {
	beforeEach(() => vi.resetAllMocks());
	afterEach(() => vi.restoreAllMocks());

	it('создаёт токен и отправляет письмо существующему пользователю', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(PASSWORD_RESET.account);
		vi.mocked(createPasswordResetToken).mockResolvedValue(PASSWORD_RESET.token);

		const result = await requestPasswordReset(
			{ email: PASSWORD_RESET.email },
			PASSWORD_RESET.origin
		);

		expect(result).toEqual({ success: true });
		expect(getUserByEmail).toHaveBeenCalledExactlyOnceWith(PASSWORD_RESET.email);
		expect(createPasswordResetToken).toHaveBeenCalledExactlyOnceWith(PASSWORD_RESET.account.id);
		expect(sendResetPasswordLink).toHaveBeenCalledExactlyOnceWith({
			email: PASSWORD_RESET.account.email,
			token: PASSWORD_RESET.token,
			origin: PASSWORD_RESET.origin
		});
	});

	it('нормализует почту перед поиском', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);

		await requestPasswordReset({ email: PASSWORD_RESET.unnormalizedEmail }, PASSWORD_RESET.origin);

		expect(getUserByEmail).toHaveBeenCalledExactlyOnceWith(PASSWORD_RESET.email);
	});

	it('возвращает успех для неизвестной почты без создания токена и отправки письма', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);

		const result = await requestPasswordReset(
			{ email: PASSWORD_RESET.email },
			PASSWORD_RESET.origin
		);

		expect(result).toEqual({ success: true });
		expect(createPasswordResetToken).not.toHaveBeenCalled();
		expect(sendResetPasswordLink).not.toHaveBeenCalled();
	});

	it.each(PASSWORD_RESET.invalidEmails)(
		'возвращает ошибку для почты $email',
		async ({ email, error }) => {
			const result = await requestPasswordReset({ email }, PASSWORD_RESET.origin);

			expect(result).toEqual({
				success: false,
				errors: { formErrors: [], fieldErrors: { email: [error] } }
			});
			expect(getUserByEmail).not.toHaveBeenCalled();
			expect(createPasswordResetToken).not.toHaveBeenCalled();
			expect(sendResetPasswordLink).not.toHaveBeenCalled();
		}
	);

	it('логирует ошибку письма и возвращает успех', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(PASSWORD_RESET.account);
		vi.mocked(createPasswordResetToken).mockResolvedValue(PASSWORD_RESET.token);
		const error = new Error(PASSWORD_RESET.errorMessage);
		vi.mocked(sendResetPasswordLink).mockRejectedValue(error);
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await requestPasswordReset(
			{ email: PASSWORD_RESET.email },
			PASSWORD_RESET.origin
		);

		expect(result).toEqual({ success: true });
		expect(log).toHaveBeenCalledExactlyOnceWith('Ошибка отправки письма сброса пароля:', error);
	});

	it('передаёт ошибку поиска пользователя', async () => {
		vi.mocked(getUserByEmail).mockRejectedValue(new Error(PASSWORD_RESET.errorMessage));

		await expect(
			requestPasswordReset({ email: PASSWORD_RESET.email }, PASSWORD_RESET.origin)
		).rejects.toThrow(PASSWORD_RESET.errorMessage);
		expect(createPasswordResetToken).not.toHaveBeenCalled();
		expect(sendResetPasswordLink).not.toHaveBeenCalled();
	});

	it('передаёт ошибку создания токена и не отправляет письмо', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(PASSWORD_RESET.account);
		vi.mocked(createPasswordResetToken).mockRejectedValue(new Error(PASSWORD_RESET.errorMessage));

		await expect(
			requestPasswordReset({ email: PASSWORD_RESET.email }, PASSWORD_RESET.origin)
		).rejects.toThrow(PASSWORD_RESET.errorMessage);
		expect(sendResetPasswordLink).not.toHaveBeenCalled();
	});
});

describe('resetPassword', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(hashToken).mockReturnValue(PASSWORD_RESET.tokenHash);
		vi.mocked(hashPassword).mockResolvedValue(PASSWORD_RESET.newPasswordHash);
	});

	it('хеширует пароль и токен и обновляет пароль', async () => {
		vi.mocked(resetPasswordByTokenHash).mockResolvedValue(true);

		const result = await resetPassword(PASSWORD_RESET.token, {
			password: PASSWORD_RESET.newPassword,
			confirmPassword: PASSWORD_RESET.newPassword
		});

		expect(result).toEqual({ success: true });
		expect(hashPassword).toHaveBeenCalledExactlyOnceWith(PASSWORD_RESET.newPassword);
		expect(hashToken).toHaveBeenCalledExactlyOnceWith(PASSWORD_RESET.token);
		expect(resetPasswordByTokenHash).toHaveBeenCalledExactlyOnceWith(
			PASSWORD_RESET.tokenHash,
			PASSWORD_RESET.newPasswordHash
		);
	});

	it.each([
		{
			password: PASSWORD_RESET.shortPassword,
			confirmPassword: PASSWORD_RESET.shortPassword,
			field: 'password'
		},
		{
			password: PASSWORD_RESET.newPassword,
			confirmPassword: PASSWORD_RESET.differentPassword,
			field: 'confirmPassword'
		}
	])(
		'возвращает ошибку поля $field и не меняет пароль',
		async ({ password, confirmPassword, field }) => {
			const result = await resetPassword(PASSWORD_RESET.token, { password, confirmPassword });

			expect(result.success).toBe(false);
			if (result.success || result.reason !== 'invalid')
				throw new Error('Ожидалась ошибка валидации');
			expect(result.errors.fieldErrors[field]).toBeDefined();
			expect(hashPassword).not.toHaveBeenCalled();
			expect(resetPasswordByTokenHash).not.toHaveBeenCalled();
		}
	);

	it('возвращает ошибку недействительного токена', async () => {
		vi.mocked(resetPasswordByTokenHash).mockResolvedValue(false);

		const result = await resetPassword(PASSWORD_RESET.token, {
			password: PASSWORD_RESET.newPassword,
			confirmPassword: PASSWORD_RESET.newPassword
		});

		expect(result).toEqual({ success: false, reason: 'invalid-token' });
	});
});
