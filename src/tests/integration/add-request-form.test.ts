import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { addUserWithData } from '@server/auth/registration';
import { queuesTable, requestsTable, usersTable } from '@db/schema';
import { hashPassword } from '@server/auth/password';
import { LOGIN } from '../mock/login';
import { QUEUE } from '../mock/queue';

describe('добавление заказа через форму', () => {
	let browser: Browser;
	let page: Page;
	let userId: number | null = null;
	const origin = inject('integrationOrigin');
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
		browser = await chromium.launch({ headless: true });
		page = await browser.newPage();
	}, 30000);
	afterAll(async () => {
		await page?.close();
		await browser?.close();
		if (userId !== null) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});
	async function openForm() {
		await page.close();
		page = await browser.newPage();
		await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Пароль').fill(LOGIN.data.password);
		await page.getByRole('button', { name: 'Войти' }).click();
		await page.waitForURL(`${origin}/`);
	}
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

	it('показывает ошибки пустых полей и очищает их при изменении', async () => {
		await openForm();
		let submitted = false;
		page.on('request', (request) => {
			if (request.method() === 'POST' && request.url().includes('?/addRequest')) submitted = true;
		});
		await page.getByRole('button', { name: 'Добавить' }).click();
		await page.getByText('Введите название заказа').waitFor();
		await page.getByText('Введите ник зрителя').waitFor();
		await page.getByPlaceholder('Клип, игра или другой заказ').fill(QUEUE.title);
		await page.getByText('Введите название заказа').waitFor({ state: 'hidden' });
		expect(await page.getByText('Введите ник зрителя').isVisible()).toBe(true);
		await page.getByPlaceholder('Ник зрителя').fill(QUEUE.viewerName);
		await page.getByText('Введите ник зрителя').waitFor({ state: 'hidden' });
		expect(submitted).toBe(false);
	});

	it('при ошибке сохраняет значения и разблокирует кнопку', async () => {
		await openForm();
		await page.getByPlaceholder('Клип, игра или другой заказ').fill(QUEUE.title);
		await page.getByPlaceholder('Ник зрителя').fill(QUEUE.viewerName);
		let release!: () => void;
		const wait = new Promise<void>((resolve) => {
			release = resolve;
		});
		let submitted!: () => void;
		const requestStarted = new Promise<void>((resolve) => {
			submitted = resolve;
		});
		await page.route('**/?/addRequest', async (route) => {
			submitted();
			await wait;
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify(QUEUE.failureResponse)
			});
		});
		await page.getByRole('button', { name: 'Добавить' }).click();
		await requestStarted;
		expect(await page.getByRole('button', { name: 'Добавить' }).isDisabled()).toBe(true);
		expect(await page.getByPlaceholder('Ник зрителя').isEnabled()).toBe(true);
		expect(await page.getByRole('status', { name: 'Загрузка' }).count()).toBe(0);
		const loggedError = page.waitForEvent(
			'console',
			(message) => message.type() === 'error' && message.text().includes(QUEUE.formError)
		);
		release();
		await loggedError;
		await page.getByRole('button', { name: 'Добавить' }).waitFor({ state: 'visible' });
		await page.waitForFunction(
			() =>
				!document.querySelector<HTMLButtonElement>('.request-add-form button[type=submit]')
					?.disabled
		);
		expect(await page.getByPlaceholder('Клип, игра или другой заказ').inputValue()).toBe(
			QUEUE.title
		);
		expect(await page.getByPlaceholder('Ник зрителя').inputValue()).toBe(QUEUE.viewerName);
		await page.unroute('**/?/addRequest');
	}, 30000);
});
