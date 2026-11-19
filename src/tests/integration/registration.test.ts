import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { addUserWithData } from '@db/actions/user';
import { usersDataTable, usersTable } from '@db/schema';
import { REGISTRATION } from '../mock/registration';

describe('регистрация в PostgreSQL', () => {
	it('создаёт только одного пользователя при одновременных запросах с одной почтой', async () => {
		const databaseUrl = new URL(DATABASE_URL);

		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseUrl.hostname) ||
			databaseUrl.port !== '5433' ||
			databaseUrl.pathname !== '/local'
		) {
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		}

		const email = `vitest-${randomUUID()}@example.com`;
		const createdIds: number[] = [];

		try {
			const results = await Promise.allSettled(
				[1, 2].map(async () => {
					const id = await addUserWithData(email, REGISTRATION.testPasswordHash);
					if (id !== null) createdIds.push(id);
					return id;
				})
			);

			expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
			expect(
				results.filter((result) => result.status === 'fulfilled' && result.value === null)
			).toHaveLength(1);
			expect(createdIds).toHaveLength(1);

			const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
			const data = await db
				.select()
				.from(usersDataTable)
				.where(eq(usersDataTable.userId, createdIds[0]));

			expect(users).toHaveLength(1);
			expect(data).toHaveLength(1);
		} finally {
			for (const id of createdIds) {
				await db.delete(usersTable).where(eq(usersTable.id, id));
			}
		}
	});
});
