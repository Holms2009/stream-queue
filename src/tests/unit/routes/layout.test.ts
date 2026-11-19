import { describe, expect, it } from 'vitest';

import { load } from '../../../routes/+layout.server';
import { SESSION } from '../../mock/session';

describe('данные корневого layout', () => {
	it('возвращает только данные пользователя, доступные интерфейсу', async () => {
		const user = {
			id: SESSION.user.userId,
			email: SESSION.user.email,
			emailVerified: SESSION.user.emailVerified,
			displayName: SESSION.user.displayName,
			avatar: SESSION.user.avatar
		};
		const event = { locals: { user } } as unknown as Parameters<typeof load>[0];

		expect(await load(event)).toEqual({
			user: { id: user.id, displayName: user.displayName, avatar: user.avatar }
		});
	});

	it('возвращает null для гостя', async () => {
		const event = { locals: { user: null } } as unknown as Parameters<typeof load>[0];

		expect(await load(event)).toEqual({ user: null });
	});
});
