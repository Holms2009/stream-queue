import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';

import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken
} from '@server/auth/session';
import { getUserDataByUserId } from '@db/actions/user';

const PUBLIC_ROUTES = new Set([
	'/login',
	'/register',
	'/register/success',
	'/confirm-email',
	'/forgot-password'
]);

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = null;
	event.locals.user = null;

	const token = event.cookies.get('sq_sid');

	if (token !== undefined) {
		const session = token ? await validateSessionToken(token) : null;

		if (!session) {
			deleteSessionTokenCookie(event);
		} else {
			const userData = await getUserDataByUserId(session.userId);

			if (!userData) {
				deleteSessionTokenCookie(event);
			} else {
				event.locals.session = session;
				event.locals.user = {
					id: userData.userId,
					email: userData.email,
					emailVerified: userData.emailVerified,
					displayName: userData.displayName,
					avatar: userData.avatar
				};

				setSessionTokenCookie(event.cookies, token, session.expiresAt);
			}
		}
	}

	if (event.route.id && !PUBLIC_ROUTES.has(event.route.id) && !event.locals.session) {
		redirect(303, '/login');
	}

	return resolve(event);
};
