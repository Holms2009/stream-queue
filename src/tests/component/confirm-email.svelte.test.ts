import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import ConfirmEmailPage from '../../routes/confirm-email/+page.svelte';
import { EMAIL_VERIFICATION } from '../mock/email-verification';

vi.mock('$app/state', async () => {
	const { EMAIL_VERIFICATION } = await import('../mock/email-verification');
	return { page: { url: new URL(EMAIL_VERIFICATION.pageUrl) } };
});

describe('страница подтверждения почты', () => {
	it('при открытии предлагает подтвердить почту без отправки запроса', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		try {
			const screen = render(ConfirmEmailPage, { data: { user: null }, params: {}, form: null });

			await expect.element(screen.getByRole('button', { name: 'Подтвердить почту' })).toBeVisible();
			expect(fetchMock).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('показывает успешное подтверждение', async () => {
		const screen = render(ConfirmEmailPage, {
			data: { user: null },
			params: {},
			form: EMAIL_VERIFICATION.formSuccess
		});

		await expect.element(screen.getByRole('heading', { name: 'Почта подтверждена' })).toBeVisible();
	});

	it('показывает сообщение о недействительной ссылке', async () => {
		const screen = render(ConfirmEmailPage, {
			data: { user: null },
			params: {},
			form: EMAIL_VERIFICATION.formInvalid
		});

		await expect
			.element(screen.getByText('Ссылка недействительна или уже использована.'))
			.toBeVisible();
	});

	it('показывает сообщение о просроченной ссылке', async () => {
		const screen = render(ConfirmEmailPage, {
			data: { user: null },
			params: {},
			form: EMAIL_VERIFICATION.formExpired
		});

		await expect.element(screen.getByText('Срок действия ссылки истёк.')).toBeVisible();
	});

	it('показывает сообщение о сбое подтверждения', async () => {
		const screen = render(ConfirmEmailPage, {
			data: { user: null },
			params: {},
			form: EMAIL_VERIFICATION.formError
		});

		await expect.element(screen.getByText('Произошла ошибка. Попробуйте позже.')).toBeVisible();
	});
});
