import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { TSession } from '@db/types';

import { addSession, deleteSession, getSessionByID, updateSession } from '@db/actions/session';

export async function validateSessionToken(token: string): Promise<TSession | null> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const session = await getSessionByID(sessionId);

	if (!session) return null;

	if (Date.now() >= session.expiresAt.getTime()) {
		await deleteSession(sessionId);

		return null;
	}

	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		return await updateSession(sessionId, expiresAt);
	}

	return session;
}

export function setSessionTokenCookie(eventCookies: Cookies, token: string, expiresAt: Date): void {
	eventCookies.set('sq_sid', token, {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set('sq_sid', '', {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		maxAge: 0
	});
}

export function generateSessionToken(): string {
	const tokenBytes = new Uint8Array(20);

	crypto.getRandomValues(tokenBytes);

	return encodeBase32LowerCaseNoPadding(tokenBytes).toLowerCase();
}

export async function createSession(token: string, userId: number): Promise<TSession> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const session: TSession = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};

	await addSession(session);

	return session;
}
