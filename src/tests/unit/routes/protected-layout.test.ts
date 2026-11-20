import { describe, expect, it } from 'vitest';

import { load } from '../../../routes/(protected)/+layout.server';
import { SESSION } from '../../mock/session';

describe('защищённый layout', () => {
	it('перенаправляет гостя на страницу входа', () => {
		const event = { locals: { session: null } } as unknown as Parameters<typeof load>[0];

		expect(() => load(event)).toThrow(expect.objectContaining({ status: 303, location: '/login' }));
	});

	it('разрешает доступ с действительной сессией', () => {
		const session = {
			id: SESSION.id,
			userId: SESSION.user.userId,
			expiresAt: SESSION.renewedExpiry
		};
		const event = { locals: { session } } as unknown as Parameters<typeof load>[0];

		expect(load(event)).toBeUndefined();
	});
});
