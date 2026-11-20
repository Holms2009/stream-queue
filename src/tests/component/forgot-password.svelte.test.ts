import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
// SvelteKit не инициализирует транспорт при отдельном рендеринге страницы в тесте.
// @ts-expect-error У внутреннего модуля нет декларации типов.
import { init_transport } from '../../../node_modules/@sveltejs/kit/src/runtime/app/internal/transport.js';

import ForgotPasswordPage from '../../routes/forgot-password/+page.svelte';
import { PASSWORD_RESET } from '../mock/password-reset';

init_transport({});

describe('форма восстановления пароля', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('показывает ошибку пустой почты и не отправляет запрос', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const screen = render(ForgotPasswordPage);

		await screen.getByRole('button', { name: 'Отправить письмо' }).click();

		await expect.element(screen.getByText(PASSWORD_RESET.invalidEmails[0].error)).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('не отправляет запрос с некорректной почтой', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const screen = render(ForgotPasswordPage);

		await screen.getByPlaceholder('Email').fill(PASSWORD_RESET.invalidEmails[1].email);
		await screen.getByRole('button', { name: 'Отправить письмо' }).click();

		await expect.element(screen.getByText(PASSWORD_RESET.invalidEmails[1].error)).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('очищает ошибку почты при изменении поля', async () => {
		const screen = render(ForgotPasswordPage);
		await screen.getByRole('button', { name: 'Отправить письмо' }).click();
		await expect.element(screen.getByText(PASSWORD_RESET.invalidEmails[0].error)).toBeVisible();

		await screen.getByPlaceholder('Email').fill(PASSWORD_RESET.email);

		await expect
			.element(screen.getByText(PASSWORD_RESET.invalidEmails[0].error))
			.not.toBeInTheDocument();
	});

	it('показывает сообщение об отправке после успешного ответа', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json(PASSWORD_RESET.formResponses.success))
		);
		const screen = render(ForgotPasswordPage);

		await screen.getByPlaceholder('Email').fill(PASSWORD_RESET.email);
		await screen.getByRole('button', { name: 'Отправить письмо' }).click();

		await expect
			.element(
				screen.getByText(
					'Если аккаунт с такой почтой существует, мы отправили письмо для сброса пароля.'
				)
			)
			.toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Отправить письмо' }))
			.not.toBeInTheDocument();
	});

	it('показывает первую ошибку поля, возвращённую сервером', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(Response.json(PASSWORD_RESET.formResponses.invalid, { status: 400 }))
		);
		const screen = render(ForgotPasswordPage);

		await screen.getByPlaceholder('Email').fill(PASSWORD_RESET.email);
		await screen.getByRole('button', { name: 'Отправить письмо' }).click();

		await expect.element(screen.getByText('Ошибка почты')).toBeVisible();
		await expect.element(screen.getByText('Вторая ошибка')).not.toBeInTheDocument();
	});

	it('показывает общую ошибку и оставляет форму доступной', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json(PASSWORD_RESET.formResponses.error, { status: 500 }))
		);
		const screen = render(ForgotPasswordPage);

		await screen.getByPlaceholder('Email').fill(PASSWORD_RESET.email);
		await screen.getByRole('button', { name: 'Отправить письмо' }).click();

		await expect
			.element(screen.getByText('Не удалось отправить запрос. Попробуйте позже.'))
			.toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Отправить письмо' })).toBeVisible();
	});

	it('показывает загрузку до получения ответа', async () => {
		let resolveResponse!: (response: Response) => void;
		vi.stubGlobal(
			'fetch',
			vi.fn().mockReturnValue(
				new Promise<Response>((resolve) => {
					resolveResponse = resolve;
				})
			)
		);
		const screen = render(ForgotPasswordPage);

		await screen.getByPlaceholder('Email').fill(PASSWORD_RESET.email);
		await screen.getByRole('button', { name: 'Отправить письмо' }).click();
		await expect.element(screen.getByRole('status', { name: 'Загрузка' })).toBeVisible();

		resolveResponse(Response.json(PASSWORD_RESET.formResponses.success));

		await expect.element(screen.getByRole('status', { name: 'Загрузка' })).not.toBeInTheDocument();
		await expect
			.element(
				screen.getByText(
					'Если аккаунт с такой почтой существует, мы отправили письмо для сброса пароля.'
				)
			)
			.toBeVisible();
	});
});
