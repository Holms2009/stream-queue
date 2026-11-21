import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
// SvelteKit не инициализирует транспорт при отдельном рендеринге страницы в тесте.
// @ts-expect-error У внутреннего модуля нет декларации типов.
import { init_transport } from '../../../node_modules/@sveltejs/kit/src/runtime/app/internal/transport.js';
import ResetPasswordPage from '../../routes/reset-password/+page.svelte';
import { PASSWORD_RESET } from '../mock/password-reset';

vi.mock('$app/state', async () => {
	const { PASSWORD_RESET } = await import('../mock/password-reset');
	return { page: { url: new URL(PASSWORD_RESET.resetPageUrl) } };
});

init_transport({});

function renderPage(status: 'valid-token' | 'invalid-token' | 'error' = 'valid-token') {
	return render(ResetPasswordPage, { data: { user: null, status }, params: {}, form: null });
}

async function fillPasswords(screen: ReturnType<typeof renderPage>) {
	await screen.getByPlaceholder('Пароль', { exact: true }).fill(PASSWORD_RESET.newPassword);
	await screen.getByPlaceholder('Повторите пароль').fill(PASSWORD_RESET.newPassword);
}

describe('страница установки пароля', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('показывает форму при действительной ссылке', async () => {
		const screen = renderPage();
		await expect.element(screen.getByRole('button', { name: 'Изменить пароль' })).toBeVisible();
	});

	it('показывает ссылку для повторного запроса при недействительном токене', async () => {
		const screen = renderPage('invalid-token');
		await expect
			.element(screen.getByRole('heading', { name: 'Ссылка недействительна' }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('link', { name: 'Запросить новую ссылку' }))
			.toHaveAttribute('href', '/forgot-password');
	});

	it('показывает ошибку проверки ссылки', async () => {
		const screen = renderPage('error');
		await expect
			.element(screen.getByRole('heading', { name: 'Не удалось проверить ссылку' }))
			.toBeVisible();
	});

	it('не отправляет некорректный пароль или несовпадающее подтверждение', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const screen = renderPage();
		await screen.getByPlaceholder('Пароль', { exact: true }).fill(PASSWORD_RESET.shortPassword);
		await screen.getByPlaceholder('Повторите пароль').fill(PASSWORD_RESET.shortPassword);
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect
			.element(screen.getByText('Пароль должен содержать не менее 8 символов'))
			.toBeVisible();
		await screen.getByPlaceholder('Пароль', { exact: true }).fill(PASSWORD_RESET.newPassword);
		await screen.getByPlaceholder('Повторите пароль').fill(PASSWORD_RESET.differentPassword);
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect.element(screen.getByText('Пароли не совпадают')).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('очищает ошибку изменённого поля и подтверждения при изменении пароля', async () => {
		const screen = renderPage();
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect.element(screen.getByText('Введите пароль')).toBeVisible();
		await screen.getByPlaceholder('Пароль', { exact: true }).fill(PASSWORD_RESET.newPassword);
		await expect.element(screen.getByText('Введите пароль')).not.toBeInTheDocument();
		await screen.getByPlaceholder('Повторите пароль').fill(PASSWORD_RESET.differentPassword);
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect.element(screen.getByText('Пароли не совпадают')).toBeVisible();
		await screen.getByPlaceholder('Пароль', { exact: true }).fill(PASSWORD_RESET.differentPassword);
		await expect.element(screen.getByText('Пароли не совпадают')).not.toBeInTheDocument();
	});

	it('показывает и скрывает загрузку', async () => {
		let resolveResponse!: (response: Response) => void;
		vi.stubGlobal(
			'fetch',
			vi.fn().mockReturnValue(
				new Promise<Response>((resolve) => {
					resolveResponse = resolve;
				})
			)
		);
		const screen = renderPage();
		await fillPasswords(screen);
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect.element(screen.getByRole('status', { name: 'Загрузка' })).toBeVisible();
		resolveResponse(Response.json(PASSWORD_RESET.resetResponses.success));
		await expect.element(screen.getByRole('status', { name: 'Загрузка' })).not.toBeInTheDocument();
	});

	it('показывает успех и ссылку на вход', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json(PASSWORD_RESET.resetResponses.success))
		);
		const screen = renderPage();
		await fillPasswords(screen);
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect.element(screen.getByRole('heading', { name: 'Пароль изменён' })).toBeVisible();
		await expect
			.element(screen.getByRole('link', { name: 'Перейти ко входу' }))
			.toHaveAttribute('href', '/login');
	});

	it('показывает ошибку устаревшего токена после отправки', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					Response.json(PASSWORD_RESET.resetResponses.invalidToken, { status: 400 })
				)
		);
		const screen = renderPage();
		await fillPasswords(screen);
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect
			.element(screen.getByRole('link', { name: 'Запросить новую ссылку' }))
			.toBeVisible();
	});

	it('показывает ошибку сервера и оставляет форму доступной', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json(PASSWORD_RESET.resetResponses.error, { status: 500 }))
		);
		const screen = renderPage();
		await fillPasswords(screen);
		await screen.getByRole('button', { name: 'Изменить пароль' }).click();
		await expect
			.element(screen.getByText('Не удалось изменить пароль. Попробуйте позже.'))
			.toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Изменить пароль' })).toBeVisible();
	});
});
