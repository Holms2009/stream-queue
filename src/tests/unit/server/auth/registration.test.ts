import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addUser, addUserData, getUserByEmail } from '@db/actions/user';
import { addQueue } from '@db/actions/queue';
import { registerUser } from '@server/auth/registration';
import { REGISTRATION } from '../../../mock/registration';

vi.mock('@db/actions/user', () => ({
	addUser: vi.fn(),
	addUserData: vi.fn(),
	getUserByEmail: vi.fn()
}));
vi.mock('@db', () => ({ withTransaction: (callback: (tx: object) => unknown) => callback({}) }));
vi.mock('@db/actions/queue', () => ({ addQueue: vi.fn() }));

describe('registerUser', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('создаёт пользователя со свободной почтой', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);
		vi.mocked(addUser).mockResolvedValue(REGISTRATION.existingUser as Awaited<ReturnType<typeof addUser>>);
		vi.mocked(addUserData).mockResolvedValue({} as NonNullable<Awaited<ReturnType<typeof addUserData>>>);
		vi.mocked(addQueue).mockResolvedValue({} as NonNullable<Awaited<ReturnType<typeof addQueue>>>);

		const result = await registerUser(REGISTRATION.dataWithUnnormalizedEmail);

		expect(result).toEqual({ success: true, userId: 1, email: 'user@example.com' });
		expect(addUser).toHaveBeenCalledWith('user@example.com', expect.any(String), expect.any(Object));
	});

	it('возвращает ошибку валидации до обращения к БД', async () => {
		const result = await registerUser(REGISTRATION.dataWithEmptyEmail);

		expect(result).toMatchObject({
			success: false,
			reason: 'invalid',
			errors: { formErrors: [], fieldErrors: { email: ['Введите почту'] } }
		});
		expect(getUserByEmail).not.toHaveBeenCalled();
		expect(addUser).not.toHaveBeenCalled();
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
		expect(addUser).not.toHaveBeenCalled();
	});

	it('возвращает конфликт, если почту заняли после предварительной проверки', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);
		vi.mocked(addUser).mockResolvedValue(null);

		const result = await registerUser(REGISTRATION.data);

		expect(result).toMatchObject({
			success: false,
			reason: 'email-conflict',
			errors: { formErrors: [], fieldErrors: { email: ['Почта уже используется'] } }
		});
	});
});
