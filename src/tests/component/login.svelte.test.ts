import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import LoginPage from '../../routes/login/+page.svelte';
import { LOGIN } from '../mock/login';

describe('форма входа', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('показывает ошибки пустых полей и не отправляет запрос', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const screen = render(LoginPage);
		await screen.getByRole('button', { name: 'Войти' }).click();
		await expect.element(screen.getByText('Введите почту')).toBeVisible();
		await expect.element(screen.getByText('Введите пароль')).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('не отправляет запрос с некорректной почтой', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const screen = render(LoginPage);
		await screen.getByPlaceholder('Email').fill(LOGIN.invalidInputs[1].data.email);
		await screen.getByPlaceholder('Пароль').fill(LOGIN.data.password);
		await screen.getByRole('button', { name: 'Войти' }).click();
		await expect.element(screen.getByText('Введите корректный адрес почты')).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('очищает ошибку изменённого поля, сохраняя другую', async () => {
		const screen = render(LoginPage);
		await screen.getByRole('button', { name: 'Войти' }).click();
		await expect.element(screen.getByText('Введите почту')).toBeVisible();
		await screen.getByPlaceholder('Email').fill(LOGIN.data.email);
		await expect.element(screen.getByText('Введите почту')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Введите пароль')).toBeVisible();
	});
});
