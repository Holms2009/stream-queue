import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';

import { DATABASE_URL } from '$app/env/private';
import { db } from '@db';
import { passwordResetTokens, usersTable } from '@db/schema';
import { PASSWORD_RESET } from '../mock/password-reset';

describe('запрос сброса пароля', () => {
	let browser: Browser;
	let page: Page;
	const origin = inject('integrationOrigin');
	let userId: number | undefined;
	async function getSentEmails(): Promise<{ email: string }[]> {
		const response = await page.request.get(`${origin}/__test/emails`);
		return await response.json();
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
		browser = await chromium.launch({ headless: true });
	}, 30000);

	afterAll(async () => {
		await browser?.close();
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
		const sentEmails = await getSentEmails();
		expect(sentEmails.filter((message) => message.email === email)).toHaveLength(1);
	});

	it('показывает такое же сообщение для неизвестной почты', async () => {
		const sentCount = (await getSentEmails()).filter(
			(message) => message.email === unknownEmail
		).length;
		await page.getByPlaceholder('Email').fill(unknownEmail);
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByText(PASSWORD_RESET.successMessage).waitFor();

		expect(await page.getByText(PASSWORD_RESET.successMessage).isVisible()).toBe(true);
		expect(
			(await getSentEmails()).filter((message) => message.email === unknownEmail)
		).toHaveLength(sentCount);
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
	it('показывает ошибки почты и не отправляет некорректные данные', async () => {
		let posts = 0;
		page.on('request', (request) => {
			if (request.method() === 'POST') posts++;
		});
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByText(PASSWORD_RESET.invalidEmails[0].error).waitFor();
		await page.getByPlaceholder('Email').fill(PASSWORD_RESET.invalidEmails[1].email);
		await page.getByText(PASSWORD_RESET.invalidEmails[0].error).waitFor({ state: 'hidden' });
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByText(PASSWORD_RESET.invalidEmails[1].error).waitFor();
		expect(posts).toBe(0);
	});

	it('показывает первую серверную ошибку поля', async () => {
		await page.route('**/forgot-password', async (route) => {
			if (route.request().method() !== 'POST') return route.continue();
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify(PASSWORD_RESET.formResponses.invalid)
			});
		});
		await page.getByPlaceholder('Email').fill(PASSWORD_RESET.email);
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByText('Ошибка почты', { exact: true }).waitFor();
		expect(await page.getByText('Вторая ошибка').count()).toBe(0);
	});

	it('показывает общую ошибку и оставляет форму доступной', async () => {
		await page.route('**/forgot-password', async (route) => {
			if (route.request().method() !== 'POST') return route.continue();
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify(PASSWORD_RESET.formResponses.error)
			});
		});
		await page.getByPlaceholder('Email').fill(PASSWORD_RESET.email);
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByText('Не удалось отправить запрос. Попробуйте позже.').waitFor();
		expect(await page.getByRole('button', { name: 'Отправить письмо' }).isVisible()).toBe(true);
	});

	it('показывает загрузку до ответа и сообщение после успеха', async () => {
		let release!: () => void;
		const pending = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route('**/forgot-password', async (route) => {
			if (route.request().method() !== 'POST') return route.continue();
			await pending;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(PASSWORD_RESET.formResponses.success)
			});
		});
		await page.getByPlaceholder('Email').fill(PASSWORD_RESET.email);
		await page.getByRole('button', { name: 'Отправить письмо' }).click();
		await page.getByRole('status', { name: 'Загрузка' }).waitFor();
		release();
		await page.getByRole('status', { name: 'Загрузка' }).waitFor({ state: 'hidden' });
		await page.getByText(PASSWORD_RESET.successMessage).waitFor();
		expect(await page.getByRole('button', { name: 'Отправить письмо' }).count()).toBe(0);
	});
});
