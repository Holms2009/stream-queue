import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ResetPasswordPage from '../../routes/reset-password/+page.svelte';

vi.mock('$app/state', async () => {
	const { PASSWORD_RESET } = await import('../mock/password-reset');
	return { page: { url: new URL(PASSWORD_RESET.resetPageUrl) } };
});

function renderPage(status: 'valid-token' | 'invalid-token' | 'error' = 'valid-token') {
	return render(ResetPasswordPage, { data: { user: null, status }, params: {}, form: null });
}

describe('страница установки пароля', () => {
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
});
