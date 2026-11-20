import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loginUser } from '@server/auth/login';
import { createSession, generateSessionToken, setSessionTokenCookie } from '@server/auth/session';
import { actions } from '../../../routes/login/+page.server';
import { LOGIN } from '../../mock/login';

vi.mock('@server/auth/login', () => ({ loginUser: vi.fn() }));
vi.mock('@server/auth/session', () => ({
	createSession: vi.fn(),
	generateSessionToken: vi.fn(),
	setSessionTokenCookie: vi.fn()
}));

function createEvent() {
	const formData = new FormData();
	formData.set('email', LOGIN.data.email);
	formData.set('password', LOGIN.data.password);

	return {
		request: new Request(LOGIN.url, { method: 'POST', body: formData }),
		cookies: { set: vi.fn() }
	} as unknown as Parameters<typeof actions.default>[0];
}

describe('обработчик входа', () => {
	beforeEach(() => vi.resetAllMocks());

	it('создаёт сессию, устанавливает cookie и перенаправляет на главную', async () => {
		vi.mocked(loginUser).mockResolvedValue({ success: true, userId: LOGIN.user.id });
		vi.mocked(generateSessionToken).mockReturnValue(LOGIN.token);
		vi.mocked(createSession).mockResolvedValue(LOGIN.session);
		const event = createEvent();

		await expect(actions.default(event)).rejects.toMatchObject({ status: 303, location: '/' });
		expect(loginUser).toHaveBeenCalledExactlyOnceWith(LOGIN.data);
		expect(createSession).toHaveBeenCalledExactlyOnceWith(LOGIN.token, LOGIN.user.id);
		expect(setSessionTokenCookie).toHaveBeenCalledExactlyOnceWith(
			event.cookies,
			LOGIN.token,
			LOGIN.session.expiresAt
		);
	});

	it('возвращает ошибки полей и не создаёт сессию', async () => {
		vi.mocked(loginUser).mockResolvedValue(LOGIN.invalid);

		expect(await actions.default(createEvent())).toMatchObject({
			status: 400,
			data: { errors: LOGIN.invalid.errors }
		});
		expect(createSession).not.toHaveBeenCalled();
		expect(setSessionTokenCookie).not.toHaveBeenCalled();
	});

	it('возвращает ошибку учётных данных и не создаёт сессию', async () => {
		vi.mocked(loginUser).mockResolvedValue(LOGIN.invalidCredentials);

		expect(await actions.default(createEvent())).toMatchObject({
			status: 401,
			data: { errors: LOGIN.invalidCredentials.errors }
		});
		expect(createSession).not.toHaveBeenCalled();
		expect(setSessionTokenCookie).not.toHaveBeenCalled();
	});

	it('возвращает общую ошибку при сбое входа', async () => {
		vi.mocked(loginUser).mockRejectedValue(new Error(LOGIN.error));

		expect(await actions.default(createEvent())).toMatchObject({
			status: 500,
			data: { errors: { formErrors: ['Не удалось войти. Попробуйте позже.'], fieldErrors: {} } }
		});
		expect(createSession).not.toHaveBeenCalled();
		expect(setSessionTokenCookie).not.toHaveBeenCalled();
	});

	it('возвращает общую ошибку при сбое создания сессии', async () => {
		vi.mocked(loginUser).mockResolvedValue({ success: true, userId: LOGIN.user.id });
		vi.mocked(generateSessionToken).mockReturnValue(LOGIN.token);
		vi.mocked(createSession).mockRejectedValue(new Error(LOGIN.error));

		expect(await actions.default(createEvent())).toMatchObject({
			status: 500,
			data: { errors: { formErrors: ['Не удалось войти. Попробуйте позже.'], fieldErrors: {} } }
		});
		expect(setSessionTokenCookie).not.toHaveBeenCalled();
	});
});
