import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { addUserWithData } from '@db/actions/user';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { hashPassword } from '@server/auth/password';
import { LOGIN } from '../mock/login';
import { QUEUE } from '../mock/queue';

describe('добавление заказа через форму', () => {
	let server: ViteDevServer;
	let browser: Browser;
	let page: Page;
	let userId: number | null = null;
	let origin: string;
	const email = `vitest-${randomUUID()}@example.com`;

	beforeAll(async () => {
		const url = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
			url.port !== '5433' ||
			url.pathname !== '/local'
		)
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		userId = await addUserWithData(email, await hashPassword(LOGIN.data.password));
		if (userId === null) throw new Error('Не удалось создать тестового пользователя');
		server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
		await server.listen();
		const address = server.httpServer?.address();
		if (!address || typeof address === 'string') throw new Error('Не удалось запустить сервер');
		origin = `http://127.0.0.1:${address.port}`;
		browser = await chromium.launch({ headless: true });
		page = await browser.newPage();
	}, 30000);
	afterAll(async () => {
		await page?.close();
		await browser?.close();
		await server?.close();
		if (userId !== null) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});
	it('добавляет заказ, обновляет список и очищает поля', async () => {
		await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Пароль').fill(LOGIN.data.password);
		await page.getByRole('button', { name: 'Войти' }).click();
		await page.waitForURL(`${origin}/`);
		await page.getByPlaceholder('Клип, игра или другой заказ').fill(QUEUE.requestInput.title);
		await page.getByPlaceholder('Ник зрителя').fill(QUEUE.requestInput.viewerName);
		await page.getByRole('button', { name: 'Добавить' }).click();
		await page.getByText(QUEUE.title, { exact: true }).waitFor();
		await page.waitForFunction(() =>
			Array.from(
				document.querySelectorAll<HTMLInputElement>('.request-add-form input:not([type=hidden])')
			).every((input) => input.value === '')
		);
		expect(await page.getByPlaceholder('Клип, игра или другой заказ').inputValue()).toBe('');
		expect(await page.getByPlaceholder('Ник зрителя').inputValue()).toBe('');
		const [queue] = await db.select().from(queuesTable).where(eq(queuesTable.userId, userId!));
		const orders = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queue.id));
		expect(orders).toHaveLength(1);
		expect(orders[0]).toMatchObject({
			title: QUEUE.title,
			viewerName: QUEUE.viewerName,
			status: 'waiting',
			position: 1
		});
	}, 30000);
});
