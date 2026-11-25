import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { hashPassword } from '@server/auth/password';
import { addUserWithData } from '@server/auth/registration';
import { LOGIN } from '../mock/login';
import { QUEUE } from '../mock/queue';

describe('переключение заказа на главной', () => {
	let browser: Browser;
	let page: Page;
	let userId: number | null = null;
	let queueId: number;
	const email = `vitest-${randomUUID()}@example.com`;
	const origin = inject('integrationOrigin');
	beforeAll(async () => {
		const url = new URL(DATABASE_URL);
		if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || url.port !== '5433' || url.pathname !== '/local')
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');
		userId = await addUserWithData(email, await hashPassword(LOGIN.data.password));
		if (userId === null) throw new Error('Не удалось создать тестового пользователя');
		const [queue] = await db.select().from(queuesTable).where(eq(queuesTable.userId, userId));
		queueId = queue.id;
		browser = await chromium.launch({ headless: true });
	});
	beforeEach(async () => {
		await db.insert(requestsTable).values({ queueId, title: QUEUE.waitingTitle, viewerName: QUEUE.viewerName, status: 'waiting', position: 1 });
		page = await browser.newPage();
	});
	afterEach(async () => {
		await page?.close();
		if (queueId !== undefined) await db.delete(requestsTable).where(eq(requestsTable.queueId, queueId));
	});
	afterAll(async () => {
		await browser?.close();
		if (userId !== null) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});
	async function login() {
		await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Пароль').fill(LOGIN.data.password);
		await page.getByRole('button', { name: 'Войти' }).click();
		await page.waitForURL(`${origin}/`);
	}
	async function addActive() {
		await db.insert(requestsTable).values({ queueId, title: QUEUE.activeTitle, viewerName: QUEUE.viewerName, status: 'active' });
	}
	it('открывает модалку при выборе заказа и не меняет заказы при отказе', async () => {
		await addActive(); await login();
		await page.getByRole('button', { name: 'Взять', exact: true }).click();
		await page.getByRole('dialog').waitFor();
		await page.getByRole('button', { name: 'Не переключать' }).click();
		await page.getByRole('dialog').waitFor({ state: 'hidden' });
		const rows = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		expect(rows.find((row) => row.title === QUEUE.activeTitle)?.status).toBe('active');
		expect(rows.find((row) => row.title === QUEUE.waitingTitle)?.status).toBe('waiting');
	});
	it('включает выбранный заказ без модалки, если активного нет', async () => {
		await login();
		await page.getByRole('button', { name: 'Взять', exact: true }).click();
		await page.locator('.active-request-card').getByText(QUEUE.waitingTitle).waitFor();
		expect(await page.getByRole('dialog').count()).toBe(0);
		const [row] = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		expect(row.status).toBe('active');
	});
	it('кнопка готово включает следующий заказ без модалки', async () => {
		await addActive(); await login();
		await page.getByRole('button', { name: 'Готово, следующий' }).click();
		await page.locator('.active-request-card').getByText(QUEUE.waitingTitle).waitFor();
		expect(await page.getByRole('dialog').count()).toBe(0);
		const rows = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		expect(rows.find((row) => row.title === QUEUE.activeTitle)?.status).toBe('completed');
		expect(rows.find((row) => row.title === QUEUE.waitingTitle)?.status).toBe('active');
	});
	it.each(QUEUE.removalActions)('открывает подтверждение действия $button и сохраняет заказ при отказе', async ({ button }) => {
		await login();
		await page.getByRole('button', { name: button, exact: true }).click();
		await page.getByRole('dialog').waitFor();
		await page.getByRole('dialog').getByRole('button', { name: 'Отмена', exact: true }).click();
		await page.getByRole('dialog').waitFor({ state: 'hidden' });
		expect(await page.getByText(QUEUE.waitingTitle, { exact: true }).isVisible()).toBe(true);
		const [row] = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		expect(row.status).toBe('waiting');
	});
	it.each(QUEUE.removalActions)('после подтверждения $button скрывает заказ и сохраняет статус $status в БД', async ({ button, status }) => {
		await login();
		await page.getByRole('button', { name: button, exact: true }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Ок', exact: true }).click();
		await page.getByText(QUEUE.waitingTitle, { exact: true }).waitFor({ state: 'hidden' });
		const [row] = await db.select().from(requestsTable).where(eq(requestsTable.queueId, queueId));
		expect(row).toMatchObject({ title: QUEUE.waitingTitle, status });
	});

});
