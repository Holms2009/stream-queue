import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { passwordResetTokens, usersTable } from '@db/schema';
import { PASSWORD_RESET } from '../mock/password-reset';

describe('запрос сброса пароля', () => {
	let server: ViteDevServer;
	let browser: Browser;
	let page: Page;
	let origin: string;
	let userId: number | undefined;
	const sentEmails: { email: string }[] = [];
	let mockedEmailModule = false;
	function recordEmail(data: { email: string }) {
		sentEmails.push(data);
	}
	const email = `${PASSWORD_RESET.testEmailPrefix}-${randomUUID()}@example.com`;
	const unknownEmail = `${PASSWORD_RESET.testEmailPrefix}-${randomUUID()}@example.com`;

	beforeAll(async () => {
		const databaseUrl = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseUrl.hostname) ||
			databaseUrl.port !== '5433' ||
			databaseUrl.pathname !== '/local'
		) {
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		}

		const [user] = await db
			.insert(usersTable)
			.values({ email, passwordHash: PASSWORD_RESET.passwordHash })
			.returning();
		userId = user.id;
		server = await createServer({
			server: { host: '127.0.0.1', port: 0 },
			logLevel: 'error',
			plugins: [
				{
					name: 'mock-password-reset-email',
					enforce: 'pre',
					transform(_code, id) {
						if (id.replaceAll('\\', '/').endsWith('/src/lib/server/email/actions/auth.ts')) {
							mockedEmailModule = true;
							return "export async function sendResetPasswordLink(data) { process.emit('stream-queue-test-reset-email', data); }";
						}
					}
				}
			]
		});
		await server.listen();
		process.on('stream-queue-test-reset-email', recordEmail);
		const address = server.httpServer?.address();
		if (!address || typeof address === 'string') throw new Error('Не удалось запустить сервер');
		origin = `http://127.0.0.1:${address.port}`;
		browser = await chromium.launch({ headless: true });
	}, 30000);

	afterAll(async () => {
		process.off('stream-queue-test-reset-email', recordEmail);
		await browser?.close();
		await server?.close();
		if (userId !== undefined) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});

	beforeEach(async () => {
		page = await browser.newPage();
		await page.goto(`${origin}/forgot-password`, { waitUntil: 'networkidle' });
	}, 30000);

	afterEach(async () => {
		await page?.close();
	});

	it('показывает сообщение и создаёт токен для существующего пользователя', async () => {
		await page.getByPlaceholder('Email').fill(email);
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByText(PASSWORD_RESET.successMessage).waitFor();

		const tokens = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));
		expect(await page.getByText(PASSWORD_RESET.successMessage).isVisible()).toBe(true);
		expect(tokens).toHaveLength(1);
		expect(mockedEmailModule).toBe(true);
		expect(sentEmails).toHaveLength(1);
		expect(sentEmails[0].email).toBe(email);
	});

	it('показывает такое же сообщение для неизвестной почты', async () => {
		const sentCount = sentEmails.length;
		await page.getByPlaceholder('Email').fill(unknownEmail);
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByText(PASSWORD_RESET.successMessage).waitFor();

		expect(await page.getByText(PASSWORD_RESET.successMessage).isVisible()).toBe(true);
		expect(sentEmails).toHaveLength(sentCount);
	});

	it('отклоняет некорректную почту на сервере', async () => {
		const before = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));
		const response = await page.request.post(`${origin}/forgot-password`, {
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' },
			form: { email: PASSWORD_RESET.invalidEmails[1].email }
		});
		const result = await response.json();
		const after = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.userId, userId!));

		expect(response.status()).toBe(400);
		expect(result.type).toBe('failure');
		expect(result.data).toContain(PASSWORD_RESET.invalidEmails[1].error);
		expect(after).toEqual(before);
	});
});
