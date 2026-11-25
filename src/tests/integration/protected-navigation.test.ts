import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { addUserWithData } from '@server/auth/registration';
import { usersTable } from '@db/schema';
import { hashPassword } from '@server/auth/password';
import { LOGIN } from '../mock/login';
import { SESSION } from '../mock/session';

describe('переход на защищённую главную страницу', () => {
	let browser: Browser;
	let page: Page;
	const origin = inject('integrationOrigin');
	let userId: number | null = null;
	const email = `vitest-${randomUUID()}@example.com`;

	beforeAll(async () => {
		const databaseUrl = new URL(DATABASE_URL);
		if (
			!['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseUrl.hostname) ||
			databaseUrl.port !== '5433' ||
			databaseUrl.pathname !== '/local'
		)
			throw new Error('Интеграционный тест разрешено запускать только на локальной БД проекта');

		userId = await addUserWithData(email, await hashPassword(LOGIN.data.password));
		if (userId === null) throw new Error('Не удалось создать тестового пользователя');
		browser = await chromium.launch({ headless: true });
	}, 30000);

	afterAll(async () => {
		await browser?.close();
		if (userId !== null) await db.delete(usersTable).where(eq(usersTable.id, userId));
	});

	beforeEach(async () => {
		page = await browser.newPage();
		await page.goto(`${origin}/register/success`, { waitUntil: 'networkidle' });
	}, 30000);

	afterEach(async () => {
		await page?.close();
	});

	it('перенаправляет гостя на страницу входа при переходе на главную', async () => {
		await page.getByRole('button', { name: 'На главную' }).click();
		await page.waitForURL(`${origin}/login`);
		expect(page.url()).toBe(`${origin}/login`);
	});

	it('позволяет пользователю с сессией перейти на главную', async () => {
		await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Пароль').fill(LOGIN.data.password);
		await page.getByRole('button', { name: 'Войти' }).click();
		await page.waitForURL(`${origin}/`);

		await page.goto(`${origin}/register/success`, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'На главную' }).click();
		await page.waitForURL(`${origin}/`);
		expect(page.url()).toBe(`${origin}/`);
	});

	it('перенаправляет пользователя с сессией при клиентских переходах на вход и регистрацию', async () => {
		await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Пароль').fill(LOGIN.data.password);
		await page.getByRole('button', { name: 'Войти' }).click();
		await page.waitForURL(`${origin}/`);

		for (const route of SESSION.guestRoutes) {
			await page.evaluate((href) => {
				const link = document.createElement('a');
				link.href = href;
				link.textContent = 'Перейти к форме';
				document.body.append(link);
			}, route);
			const [response] = await Promise.all([
				page.waitForResponse((response) => response.url().includes(`${route}/__data.json`)),
				page.getByRole('link', { name: 'Перейти к форме' }).click()
			]);
			await response.finished();
			await page.getByText('Очередь', { exact: true }).waitFor();
			expect(page.url()).toBe(`${origin}/`);
			await page.getByRole('link', { name: 'Перейти к форме' }).evaluate((link) => link.remove());
		}
	}, 30000);

	it('позволяет гостю переходить между формами входа и регистрации', async () => {
		await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
		await page.getByRole('link', { name: 'Создать аккаунт' }).click();
		await page.getByRole('button', { name: 'Зарегистрировать' }).waitFor();
		expect(page.url()).toBe(`${origin}/register`);
		await page.getByRole('link', { name: 'Уже зарегистрированы?' }).click();
		await page.getByRole('button', { name: 'Войти' }).waitFor();
		expect(page.url()).toBe(`${origin}/login`);
	}, 30000);
});
