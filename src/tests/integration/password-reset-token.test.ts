import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { replacePasswordResetToken } from '@db/actions/passwordReset';
import { passwordResetTokens, usersTable } from '@db/schema';
import { PASSWORD_RESET } from '../mock/password-reset';

describe('токены сброса пароля в PostgreSQL', () => {
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
				passwordHash: PASSWORD_RESET.passwordHash
			})
			.returning();
		userId = user.id;
	});

	afterEach(async () => {
		if (userId !== undefined) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});

	it('сохраняет хеш и устанавливает срок действия один час', async () => {
		const before = Date.now();
		await replacePasswordResetToken(userId!, tokenHash);
		const after = Date.now();
		const tokens = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));

		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ userId, tokenHash });
		expect(tokens[0].expiresAt.getTime()).toBeGreaterThanOrEqual(before + PASSWORD_RESET.oneHourMs);
		expect(tokens[0].expiresAt.getTime()).toBeLessThanOrEqual(after + PASSWORD_RESET.oneHourMs);
	});

	it('заменяет предыдущий токен', async () => {
		await replacePasswordResetToken(userId!, tokenHash);
		const newHash = randomUUID();

		await replacePasswordResetToken(userId!, newHash);

		const tokens = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tokenHash).toBe(newHash);
	});

	it('сохраняет один токен при параллельных запросах', async () => {
		const hashes = [randomUUID(), randomUUID()];

		await Promise.all(hashes.map((hash) => replacePasswordResetToken(userId!, hash)));

		const tokens = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));
		expect(tokens).toHaveLength(1);
		expect(hashes).toContain(tokens[0].tokenHash);
	});

	it('сохраняет прежний токен при ошибке записи нового', async () => {
		await replacePasswordResetToken(userId!, tokenHash);

		await expect(replacePasswordResetToken(userId!, null as unknown as string)).rejects.toThrow();

		const tokens = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tokenHash).toBe(tokenHash);
	});

	it('не создаёт токен для отсутствующего пользователя', async () => {
		await expect(
			replacePasswordResetToken(PASSWORD_RESET.missingUserId, tokenHash)
		).rejects.toThrow();

		const tokens = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.tokenHash, tokenHash));
		expect(tokens).toHaveLength(0);
	});
});
