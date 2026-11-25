import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';

import { REGISTRATION } from '../mock/registration';

describe('отправка формы регистрации', () => {
	let browser: Browser;
	let page: Page;
	const origin = inject('integrationOrigin');

	beforeAll(async () => {
		browser = await chromium.launch({ headless: true });
	});

	afterAll(async () => {
		await browser?.close();
	});

	beforeEach(async () => {
		page = await browser.newPage();
		await page.goto(`${origin}/register`, { waitUntil: 'networkidle' });
	}, 30000);

	afterEach(async () => {
		await page?.close();
	});

	it('отправляет корректные данные', async () => {
		let submitted: URLSearchParams | undefined;
		await page.route('**/register', async (route) => {
			submitted = new URLSearchParams(route.request().postData() ?? '');
			await route.fulfill({
				status: 409,
				contentType: 'application/json',
				body: JSON.stringify({
					type: 'failure',
					status: 409,
					data: REGISTRATION.serializedEmailConflict
				})
			});
		});
		await page.getByPlaceholder('Email').fill(REGISTRATION.data.email);
		await page.getByPlaceholder('Пароль', { exact: true }).fill(REGISTRATION.data.password);
		await page.getByPlaceholder('Повторите пароль').fill(REGISTRATION.data.confirmPassword);

		await page.getByRole('button', { name: 'Зарегистрировать' }).click();
		await page.getByText('Почта уже используется').waitFor();

		expect(submitted?.get('email')).toBe(REGISTRATION.data.email);
		expect(submitted?.get('password')).toBe(REGISTRATION.data.password);
		expect(submitted?.get('confirmPassword')).toBe(REGISTRATION.data.confirmPassword);
	});

	it('показывает ошибку почты, возвращённую сервером', async () => {
		await page.route('**/register', async (route) => {
			await route.fulfill({
				status: 409,
				contentType: 'application/json',
				body: JSON.stringify({
					type: 'failure',
					status: 409,
					data: REGISTRATION.serializedEmailConflict
				})
			});
		});
		await page.getByPlaceholder('Email').fill(REGISTRATION.data.email);
		await page.getByPlaceholder('Пароль', { exact: true }).fill(REGISTRATION.data.password);
		await page.getByPlaceholder('Повторите пароль').fill(REGISTRATION.data.confirmPassword);

		await page.getByRole('button', { name: 'Зарегистрировать' }).click();

		await page.getByText('Почта уже используется').waitFor();
		expect(await page.getByText('Почта уже используется').isVisible()).toBe(true);
	});
});
