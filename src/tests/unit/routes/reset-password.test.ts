import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPassword } from '@server/auth/password-reset';
import { verifyResetToken } from '@server/auth/tokens';
import { actions, load } from '../../../routes/reset-password/+page.server';
import { PASSWORD_RESET } from '../../mock/password-reset';

vi.mock('@server/auth/password-reset', () => ({ resetPassword: vi.fn() }));
vi.mock('@server/auth/tokens', () => ({ verifyResetToken: vi.fn() }));

function loadEvent(url: string) {
	return { url: new URL(url) } as Parameters<typeof load>[0];
}

function actionEvent(token = PASSWORD_RESET.token) {
	const form = new FormData();
	form.set('token', token);
	form.set('password', PASSWORD_RESET.newPassword);
	form.set('confirmPassword', PASSWORD_RESET.newPassword);
	return {
		request: new Request(PASSWORD_RESET.resetPageUrl, { method: 'POST', body: form })
	} as Parameters<typeof actions.default>[0];
}

describe('страница установки пароля: сервер', () => {
	beforeEach(() => vi.resetAllMocks());

	it('показывает форму для действительного токена', async () => {
		vi.mocked(verifyResetToken).mockResolvedValue({ userId: PASSWORD_RESET.userId } as Awaited<
			ReturnType<typeof verifyResetToken>
		>);
		expect(await load(loadEvent(PASSWORD_RESET.resetPageUrl))).toEqual({ status: 'valid-token' });
		expect(verifyResetToken).toHaveBeenCalledExactlyOnceWith(PASSWORD_RESET.token);
	});

	it('отклоняет отсутствующий, недействительный и просроченный токен', async () => {
		expect(await load(loadEvent(PASSWORD_RESET.origin))).toEqual({ status: 'invalid-token' });
		vi.mocked(verifyResetToken).mockResolvedValue(null);
		expect(await load(loadEvent(PASSWORD_RESET.resetPageUrl))).toEqual({ status: 'invalid-token' });
	});

	it('возвращает ошибку при сбое проверки токена', async () => {
		vi.mocked(verifyResetToken).mockRejectedValue(new Error(PASSWORD_RESET.errorMessage));
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			expect(await load(loadEvent(PASSWORD_RESET.resetPageUrl))).toEqual({ status: 'error' });
		} finally {
			log.mockRestore();
		}
	});

	it('передаёт данные в сценарий и возвращает успех', async () => {
		vi.mocked(resetPassword).mockResolvedValue({ success: true });
		expect(await actions.default(actionEvent())).toEqual({ status: 'success' });
		expect(resetPassword).toHaveBeenCalledExactlyOnceWith(PASSWORD_RESET.token, {
			password: PASSWORD_RESET.newPassword,
			confirmPassword: PASSWORD_RESET.newPassword
		});
	});

	it('возвращает ошибку валидации', async () => {
		const errors = { formErrors: [], fieldErrors: { password: [PASSWORD_RESET.errorMessage] } };
		vi.mocked(resetPassword).mockResolvedValue({ success: false, reason: 'invalid', errors });
		const result = await actions.default(actionEvent());
		expect(result).toMatchObject({ status: 400, data: { status: 'invalid', errors } });
	});

	it('возвращает ошибку недействительного токена', async () => {
		vi.mocked(resetPassword).mockResolvedValue({ success: false, reason: 'invalid-token' });
		expect(await actions.default(actionEvent())).toMatchObject({
			status: 400,
			data: { status: 'invalid-token' }
		});
		expect(await actions.default(actionEvent(''))).toMatchObject({
			status: 400,
			data: { status: 'invalid-token' }
		});
	});

	it('возвращает ошибку сервера при сбое сценария', async () => {
		vi.mocked(resetPassword).mockRejectedValue(new Error(PASSWORD_RESET.errorMessage));
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			expect(await actions.default(actionEvent())).toMatchObject({
				status: 500,
				data: { status: 'error' }
			});
		} finally {
			log.mockRestore();
		}
	});
});
