import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { addUserWithData } from '@db/actions/user';
import { passwordResetTokens, sessionsTable, usersTable } from '@db/schema';
import { hashPassword } from '@server/auth/password';
import { createPasswordResetToken } from '@server/auth/tokens';
import { PASSWORD_RESET } from '../mock/password-reset';

describe('установка нового пароля', () => {
	let server: ViteDevServer;
	let browser: Browser;
	let page: Page;
	let origin: string;
	let userId: number | null = null;
	let token: string;
	let email: string;

	beforeAll(async () => {
		const databaseUrl = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseUrl.hostname) ||
			databaseUrl.port !== '5433' ||
			databaseUrl.pathname !== '/local'
		) {
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		}
		server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
		await server.listen();
		const address = server.httpServer?.address();
		if (!address || typeof address === 'string') throw new Error('Не удалось запустить сервер');
		origin = `http://127.0.0.1:${address.port}`;
		browser = await chromium.launch({ headless: true });
	}, 30000);

	afterAll(async () => {
		await browser?.close();
		await server?.close();
	});

	beforeEach(async () => {
		email = `${PASSWORD_RESET.testEmailPrefix}-${randomUUID()}@example.com`;
		userId = await addUserWithData(email, await hashPassword(PASSWORD_RESET.differentPassword));
		if (userId === null) throw new Error('Не удалось создать тестового пользователя');
		token = await createPasswordResetToken(userId);
		await db
			.insert(sessionsTable)
			.values({
				id: randomUUID(),
				userId,
				expiresAt: new Date(Date.now() + PASSWORD_RESET.oneHourMs)
			});
		page = await browser.newPage();
		await page.goto(`${origin}/reset-password?token=${token}`, { waitUntil: 'networkidle' });
	}, 30000);

	afterEach(async () => {
		await page?.close();
		if (userId !== null) await db.delete(usersTable).where(eq(usersTable.id, userId));
		userId = null;
	});

	async function submitPassword() {
		await page.getByPlaceholder('Пароль', { exact: true }).fill(PASSWORD_RESET.newPassword);
		await page.getByPlaceholder('Повторите пароль').fill(PASSWORD_RESET.newPassword);
		await page.getByRole('button', { name: 'Изменить пароль' }).click();
		await page.getByRole('heading', { name: 'Пароль изменён' }).waitFor();
	}

	it('меняет пароль, удаляет токен и сессии и позволяет войти с новым паролем', async () => {
		await submitPassword();
		const tokens = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));
		const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.userId, userId!));
		expect(tokens).toHaveLength(0);
		expect(sessions).toHaveLength(0);
		await page.getByRole('link', { name: 'Перейти ко входу' }).click();
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Пароль').fill(PASSWORD_RESET.newPassword);
		await page.getByRole('button', { name: 'Войти' }).click();
		await page.waitForURL(`${origin}/`);
		expect(page.url()).toBe(`${origin}/`);
	}, 30000);

	it('предлагает запросить ссылку заново после использования токена', async () => {
		await submitPassword();
		await page.goto(`${origin}/reset-password?token=${token}`);
		await page.getByRole('link', { name: 'Запросить новую ссылку' }).waitFor();
		expect(await page.getByRole('link', { name: 'Запросить новую ссылку' }).isVisible()).toBe(true);
	}, 30000);
});
