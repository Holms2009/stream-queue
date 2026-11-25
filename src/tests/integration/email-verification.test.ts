import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { confirmEmailByTokenHash } from '@server/auth/email-verification';
import { replaceEmailVerifyToken } from '@server/auth/tokens';
import { emailVerifyTokensTable, usersTable } from '@db/schema';
import { EMAIL_VERIFICATION } from '../mock/email-verification';

describe('подтверждение почты в PostgreSQL', () => {
	let userId: number | undefined;
	let tokenHash: string;

	beforeEach(async () => {
		const databaseUrl = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseUrl.hostname) ||
			databaseUrl.port !== '5433' ||
			databaseUrl.pathname !== '/local'
		) {
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		}

		userId = undefined;
		tokenHash = randomUUID();
		const [user] = await db
			.insert(usersTable)
			.values({
				email: `vitest-${randomUUID()}@example.com`,
				passwordHash: EMAIL_VERIFICATION.passwordHash
			})
			.returning();
		userId = user.id;
	});

	afterEach(async () => {
		if (userId !== undefined) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});

	it('подтверждает почту и удаляет токены пользователя', async () => {
		await db.insert(emailVerifyTokensTable).values([
			{ userId: userId!, tokenHash, expiresAt: new Date(Date.now() + 60000) },
			{ userId: userId!, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) }
		]);

		const result = await confirmEmailByTokenHash(tokenHash);
		const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId!));
		const tokens = await db
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, userId!));

		expect(result).toEqual({ status: 'success' });
		expect(user.emailVerified).toBe(true);
		expect(tokens).toHaveLength(0);
	});

	it('не изменяет пользователя и токен, если токен неизвестен', async () => {
		await db
			.insert(emailVerifyTokensTable)
			.values({ userId: userId!, tokenHash, expiresAt: new Date(Date.now() + 60000) });

		const result = await confirmEmailByTokenHash(randomUUID());
		const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId!));
		const tokens = await db
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, userId!));

		expect(result).toEqual({ status: 'invalid-token' });
		expect(user.emailVerified).toBe(false);
		expect(tokens).toHaveLength(1);
	});

	it('не подтверждает почту по просроченному токену', async () => {
		await db
			.insert(emailVerifyTokensTable)
			.values({ userId: userId!, tokenHash, expiresAt: new Date(Date.now() - 60000) });

		const result = await confirmEmailByTokenHash(tokenHash);
		const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId!));
		const tokens = await db
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, userId!));

		expect(result).toEqual({ status: 'expired-token' });
		expect(user.emailVerified).toBe(false);
		expect(tokens).toHaveLength(1);
	});

	it('использует токен только один раз при одновременных запросах', async () => {
		await db
			.insert(emailVerifyTokensTable)
			.values({ userId: userId!, tokenHash, expiresAt: new Date(Date.now() + 60000) });

		const results = await Promise.all([
			confirmEmailByTokenHash(tokenHash),
			confirmEmailByTokenHash(tokenHash)
		]);

		expect(results).toEqual(
			expect.arrayContaining([{ status: 'success' }, { status: 'invalid-token' }])
		);
	});

	it('заменяет предыдущий токен новым', async () => {
		await db.insert(emailVerifyTokensTable).values({
			userId: userId!,
			tokenHash,
			expiresAt: new Date(Date.now() + 60000)
		});
		const newHash = randomUUID();

		await replaceEmailVerifyToken(userId!, newHash);

		const tokens = await db
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, userId!));
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tokenHash).toBe(newHash);
	});

	it('сохраняет только один токен при одновременной замене', async () => {
		const hashes = [randomUUID(), randomUUID()];

		await Promise.all(hashes.map((hash) => replaceEmailVerifyToken(userId!, hash)));

		const tokens = await db
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, userId!));
		expect(tokens).toHaveLength(1);
		expect(hashes).toContain(tokens[0].tokenHash);
	});

	it('согласованно выполняет подтверждение и одновременную замену токена', async () => {
		await db.insert(emailVerifyTokensTable).values({
			userId: userId!,
			tokenHash,
			expiresAt: new Date(Date.now() + 60000)
		});
		const newHash = randomUUID();

		const [confirmation] = await Promise.all([
			confirmEmailByTokenHash(tokenHash),
			replaceEmailVerifyToken(userId!, newHash)
		]);

		const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId!));
		const tokens = await db
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, userId!));
		if (confirmation.status === 'success') {
			expect(user.emailVerified).toBe(true);
			expect(tokens).toHaveLength(0);
		} else {
			expect(confirmation.status).toBe('invalid-token');
			expect(user.emailVerified).toBe(false);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].tokenHash).toBe(newHash);
		}
	});

	it('сохраняет прежний токен, если создание нового завершилось ошибкой', async () => {
		await db.insert(emailVerifyTokensTable).values({
			userId: userId!,
			tokenHash,
			expiresAt: new Date(Date.now() + 60000)
		});

		await expect(replaceEmailVerifyToken(userId!, null as unknown as string)).rejects.toThrow();

		const tokens = await db
			.select()
			.from(emailVerifyTokensTable)
			.where(eq(emailVerifyTokensTable.userId, userId!));
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tokenHash).toBe(tokenHash);
	});
});
