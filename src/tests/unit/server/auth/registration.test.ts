import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addUserWithData, getUserByEmail } from '@db/actions/user';
import { registerUser } from '@server/auth/registration';
import { REGISTRATION } from '../../../mock/registration';

vi.mock('@db/actions/user', () => ({
	addUserWithData: vi.fn(),
	getUserByEmail: vi.fn()
}));

describe('registerUser', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('создаёт пользователя со свободной почтой', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);
		vi.mocked(addUserWithData).mockResolvedValue(REGISTRATION.existingUser.id);

		const result = await registerUser(REGISTRATION.dataWithUnnormalizedEmail);

		expect(result).toEqual({ success: true, userId: 1, email: 'user@example.com' });
		expect(addUserWithData).toHaveBeenCalledWith('user@example.com', expect.any(String));
	});

	it('возвращает ошибку валидации до обращения к БД', async () => {
		const result = await registerUser(REGISTRATION.dataWithEmptyEmail);

		expect(result).toMatchObject({
			success: false,
			reason: 'invalid',
			errors: { formErrors: [], fieldErrors: { email: ['Введите почту'] } }
		});
		expect(getUserByEmail).not.toHaveBeenCalled();
		expect(addUserWithData).not.toHaveBeenCalled();
	});

	it('проверяет занятую почту после нормализации', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(
			REGISTRATION.existingUser as NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>
		);

		const result = await registerUser(REGISTRATION.dataWithUnnormalizedEmail);

		expect(getUserByEmail).toHaveBeenCalledWith('user@example.com');
		expect(result).toMatchObject({
			success: false,
			reason: 'email-conflict',
			errors: { formErrors: [], fieldErrors: { email: ['Почта уже используется'] } }
		});
		expect(addUserWithData).not.toHaveBeenCalled();
	});

	it('возвращает конфликт, если почту заняли после предварительной проверки', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);
		vi.mocked(addUserWithData).mockResolvedValue(null);

		const result = await registerUser(REGISTRATION.data);

		expect(result).toMatchObject({
			success: false,
			reason: 'email-conflict',
			errors: { formErrors: [], fieldErrors: { email: ['Почта уже используется'] } }
		});
	});
});
