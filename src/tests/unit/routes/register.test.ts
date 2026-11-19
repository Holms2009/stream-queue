import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendEmailVerification } from '@server/auth/email-verification';
import { registerUser } from '@server/auth/registration';
import { REGISTRATION } from '../../mock/registration';
import { actions } from '../../../routes/register/+page.server';

vi.mock('@server/auth/registration', () => ({ registerUser: vi.fn() }));
vi.mock('@server/auth/email-verification', () => ({ sendEmailVerification: vi.fn() }));

function createEvent() {
	const formData = new FormData();

	formData.set('email', REGISTRATION.data.email);
	formData.set('password', REGISTRATION.data.password);
	formData.set('confirmPassword', REGISTRATION.data.confirmPassword);

	return {
		request: new Request(REGISTRATION.url, { method: 'POST', body: formData }),
		url: new URL(REGISTRATION.url)
	} as unknown as Parameters<typeof actions.default>[0];
}

describe('обработчик регистрации', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('после регистрации отправляет письмо и выполняет редирект', async () => {
		vi.mocked(registerUser).mockResolvedValue(REGISTRATION.registeredUser);

		await expect(actions.default(createEvent())).rejects.toMatchObject({
			status: 303,
			location: '/register/success'
		});

		expect(sendEmailVerification).toHaveBeenCalledWith({
			userId: 1,
			email: 'user@example.com',
			origin: 'http://localhost'
		});
	});

	it('возвращает 409 и ошибку поля для занятой почты', async () => {
		vi.mocked(registerUser).mockResolvedValue(REGISTRATION.emailConflict);

		const result = await actions.default(createEvent());

		expect(result).toMatchObject({
			status: 409,
			data: {
				status: 'invalid',
				errors: { formErrors: [], fieldErrors: { email: ['Почта уже используется'] } }
			}
		});
		expect(sendEmailVerification).not.toHaveBeenCalled();
	});

	it('возвращает ошибки валидации и не отправляет письмо', async () => {
		vi.mocked(registerUser).mockResolvedValue(REGISTRATION.invalidRegistration);

		const result = await actions.default(createEvent());

		expect(result).toMatchObject({
			status: 400,
			data: { errors: { formErrors: [], fieldErrors: { email: ['Введите почту'] } } }
		});
		expect(sendEmailVerification).not.toHaveBeenCalled();
	});

	it('возвращает общую ошибку и не отправляет письмо при сбое создания аккаунта', async () => {
		vi.mocked(registerUser).mockRejectedValue(new Error(REGISTRATION.databaseErrorMessage));

		const result = await actions.default(createEvent());

		expect(result).toMatchObject({
			status: 500,
			data: {
				status: 'registration-error',
				errors: { formErrors: ['Не удалось создать аккаунт. Попробуйте позже.'], fieldErrors: {} }
			}
		});
		expect(sendEmailVerification).not.toHaveBeenCalled();
	});

	it('сообщает о созданном аккаунте при сбое отправки письма', async () => {
		vi.mocked(registerUser).mockResolvedValue(REGISTRATION.registeredUser);
		vi.mocked(sendEmailVerification).mockRejectedValue(new Error(REGISTRATION.emailErrorMessage));

		await expect(actions.default(createEvent())).rejects.toMatchObject({
			status: 303,
			location: '/register/success'
		});
	});
});
