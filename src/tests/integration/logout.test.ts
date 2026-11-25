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

describe('выход через кнопку', () => {
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
		await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
	}, 30000);

	afterEach(async () => {
		await page?.close();
	});

	it('выходит из аккаунта и не открывает главную без повторного входа', async () => {
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Пароль').fill(LOGIN.data.password);
		await page.getByRole('button', { name: 'Войти' }).click();
		await page.waitForURL(`${origin}/`);

		await page.getByRole('button', { name: 'Меню пользователя' }).click();
		await page.getByRole('menuitem', { name: 'Выйти' }).click();
		await page.waitForURL(`${origin}/login`);

		await page.goto(`${origin}/`);
		expect(page.url()).toBe(`${origin}/login`);
	});
});
