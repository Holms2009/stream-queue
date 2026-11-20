import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserByEmail } from '@db/actions/user';
import { loginUser } from '@server/auth/login';
import { verifyPasswordHash } from '@server/auth/password';
import { LOGIN } from '../../../mock/login';

vi.mock('@db/actions/user', () => ({ getUserByEmail: vi.fn() }));
vi.mock('@server/auth/password', () => ({ verifyPasswordHash: vi.fn() }));

const USER = LOGIN.user as NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>;

describe('loginUser', () => {
	beforeEach(() => vi.resetAllMocks());

	it('нормализует почту и возвращает идентификатор пользователя', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(USER);
		vi.mocked(verifyPasswordHash).mockResolvedValue(true);

		expect(await loginUser(LOGIN.unnormalizedData)).toEqual({
			success: true,
			userId: LOGIN.user.id
		});
		expect(getUserByEmail).toHaveBeenCalledExactlyOnceWith(LOGIN.data.email);
		expect(verifyPasswordHash).toHaveBeenCalledExactlyOnceWith(
			LOGIN.user.passwordHash,
			LOGIN.data.password
		);
	});

	it.each(LOGIN.invalidInputs)(
		'возвращает ошибку для некорректного поля $field',
		async ({ data, field, message }) => {
			const result = await loginUser(data);

			expect(result).toMatchObject({
				success: false,
				reason: 'invalid',
				errors: { fieldErrors: { [field]: [message] } }
			});
			expect(getUserByEmail).not.toHaveBeenCalled();
		}
	);

	it('проверяет короткий непустой пароль', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(USER);
		vi.mocked(verifyPasswordHash).mockResolvedValue(true);

		expect(await loginUser(LOGIN.shortPasswordData)).toEqual({
			success: true,
			userId: LOGIN.user.id
		});
		expect(verifyPasswordHash).toHaveBeenCalledExactlyOnceWith(
			LOGIN.user.passwordHash,
			LOGIN.shortPasswordData.password
		);
	});

	it('возвращает общую ошибку, если пользователь не найден', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);

		expect(await loginUser(LOGIN.data)).toEqual(LOGIN.invalidCredentials);
		expect(verifyPasswordHash).not.toHaveBeenCalled();
	});

	it('возвращает ту же ошибку при неверном пароле', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(USER);
		vi.mocked(verifyPasswordHash).mockResolvedValue(false);

		expect(await loginUser(LOGIN.data)).toEqual(LOGIN.invalidCredentials);
	});

	it('передаёт ошибку поиска пользователя', async () => {
		vi.mocked(getUserByEmail).mockRejectedValue(new Error(LOGIN.error));
		await expect(loginUser(LOGIN.data)).rejects.toThrow(LOGIN.error);
	});

	it('передаёт ошибку проверки пароля', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(USER);
		vi.mocked(verifyPasswordHash).mockRejectedValue(new Error(LOGIN.error));
		await expect(loginUser(LOGIN.data)).rejects.toThrow(LOGIN.error);
	});

	it('разрешает вход при неподтверждённой почте', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(USER);
		vi.mocked(verifyPasswordHash).mockResolvedValue(true);
		expect(await loginUser(LOGIN.data)).toEqual({ success: true, userId: LOGIN.user.id });
	});
});
