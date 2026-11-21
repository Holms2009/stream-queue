import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserDataByUserId } from '@db/actions/user';
import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken
} from '@server/auth/session';
import { handle } from '../../hooks.server';
import { SESSION } from '../mock/session';

vi.mock('@db/actions/user', () => ({ getUserDataByUserId: vi.fn() }));
vi.mock('@server/auth/session', () => ({
	deleteSessionTokenCookie: vi.fn(),
	setSessionTokenCookie: vi.fn(),
	validateSessionToken: vi.fn()
}));

function createRequest(token?: string, route = SESSION.publicRoutes[2]) {
	const event = {
		locals: {},
		route: { id: route },
		cookies: { get: vi.fn().mockReturnValue(token) }
	};
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	return { event, resolve, args: { event, resolve } as unknown as Parameters<typeof handle>[0] };
}

describe('серверный hook сессии', () => {
	beforeEach(() => vi.resetAllMocks());

	it('продолжает запрос без cookie и обращения к БД', async () => {
		const { event, resolve, args } = createRequest();

		await handle(args);

		expect(event.locals).toEqual({ session: null, user: null });
		expect(validateSessionToken).not.toHaveBeenCalled();
		expect(getUserDataByUserId).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
	});

	it('очищает cookie недействительной сессии', async () => {
		vi.mocked(validateSessionToken).mockResolvedValue(null);
		const { event, resolve, args } = createRequest(SESSION.token);

		await handle(args);

		expect(event.locals).toEqual({ session: null, user: null });
		expect(deleteSessionTokenCookie).toHaveBeenCalledExactlyOnceWith(event);
		expect(getUserDataByUserId).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
	});

	it('заполняет контекст и синхронизирует срок cookie с действительной сессией', async () => {
		const session = {
			id: SESSION.id,
			userId: SESSION.user.userId,
			expiresAt: SESSION.renewedExpiry
		};
		vi.mocked(validateSessionToken).mockResolvedValue(session);
		vi.mocked(getUserDataByUserId).mockResolvedValue(SESSION.user);
		const { event, resolve, args } = createRequest(SESSION.token);

		await handle(args);

		expect(validateSessionToken).toHaveBeenCalledExactlyOnceWith(SESSION.token);
		expect(getUserDataByUserId).toHaveBeenCalledExactlyOnceWith(15);
		expect(event.locals).toEqual({
			session,
			user: {
				id: 15,
				email: 'user@example.com',
				emailVerified: false,
				displayName: 'User',
				avatar: null
			}
		});
		expect(setSessionTokenCookie).toHaveBeenCalledExactlyOnceWith(
			event.cookies,
			SESSION.token,
			SESSION.renewedExpiry
		);
		expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
	});

	it('очищает cookie, если профиль пользователя не найден', async () => {
		vi.mocked(validateSessionToken).mockResolvedValue({
			id: SESSION.id,
			userId: 15,
			expiresAt: SESSION.renewedExpiry
		});
		vi.mocked(getUserDataByUserId).mockResolvedValue(null);
		const { event, resolve, args } = createRequest(SESSION.token);

		await handle(args);

		expect(event.locals).toEqual({ session: null, user: null });
		expect(deleteSessionTokenCookie).toHaveBeenCalledExactlyOnceWith(event);
		expect(setSessionTokenCookie).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
	});

	it('передаёт ошибку БД дальше и не очищает cookie', async () => {
		vi.mocked(validateSessionToken).mockRejectedValue(new Error(SESSION.databaseError));
		const { resolve, args } = createRequest(SESSION.token);

		await expect(handle(args)).rejects.toThrow(SESSION.databaseError);

		expect(deleteSessionTokenCookie).not.toHaveBeenCalled();
		expect(resolve).not.toHaveBeenCalled();
	});

	it('перенаправляет гостя с защищённого маршрута на страницу входа', async () => {
		const { resolve, args } = createRequest(undefined, SESSION.protectedRoute);

		await expect(handle(args)).rejects.toMatchObject({ status: 303, location: '/login' });
		expect(resolve).not.toHaveBeenCalled();
	});

	it.each(SESSION.publicRoutes)('разрешает гостю доступ к %s', async (route) => {
		const { event, resolve, args } = createRequest(undefined, route);

		await handle(args);

		expect(event.locals).toEqual({ session: null, user: null });
		expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
	});

	it('разрешает пользователю с сессией доступ к защищённому маршруту', async () => {
		vi.mocked(validateSessionToken).mockResolvedValue({
			id: SESSION.id,
			userId: SESSION.user.userId,
			expiresAt: SESSION.renewedExpiry
		});
		vi.mocked(getUserDataByUserId).mockResolvedValue(SESSION.user);
		const { event, resolve, args } = createRequest(SESSION.token, SESSION.protectedRoute);

		await handle(args);

		expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
	});

	it.each(SESSION.guestRoutes)(
		'перенаправляет авторизованного пользователя с %s на главную',
		async (route) => {
			vi.mocked(validateSessionToken).mockResolvedValue({
				id: SESSION.id,
				userId: SESSION.user.userId,
				expiresAt: SESSION.renewedExpiry
			});
			vi.mocked(getUserDataByUserId).mockResolvedValue(SESSION.user);
			const { resolve, args } = createRequest(SESSION.token, route);

			await expect(handle(args)).rejects.toMatchObject({ status: 303, location: '/' });
			expect(resolve).not.toHaveBeenCalled();
		}
	);

	it.each(SESSION.otherPublicRoutes)(
		'разрешает авторизованному пользователю доступ к %s',
		async (route) => {
			vi.mocked(validateSessionToken).mockResolvedValue({
				id: SESSION.id,
				userId: SESSION.user.userId,
				expiresAt: SESSION.renewedExpiry
			});
			vi.mocked(getUserDataByUserId).mockResolvedValue(SESSION.user);
			const { event, resolve, args } = createRequest(SESSION.token, route);

			await handle(args);

			expect(resolve).toHaveBeenCalledExactlyOnceWith(event);
		}
	);
});
