import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import RegisterPage from '../../routes/register/+page.svelte';
import { REGISTRATION } from '../mock/registration';

describe('форма регистрации', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('показывает ошибки полей и не отправляет некорректные данные', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const screen = render(RegisterPage);

		await screen.getByRole('button', { name: 'Зарегистрировать' }).click();

		await expect.element(screen.getByText('Введите почту')).toBeVisible();
		await expect.element(screen.getByText('Введите пароль')).toBeVisible();
		await expect.element(screen.getByText('Подтвердите пароль')).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('очищает ошибку изменённого поля, сохраняя остальные', async () => {
		const screen = render(RegisterPage);
		await screen.getByRole('button', { name: 'Зарегистрировать' }).click();
		await expect.element(screen.getByText('Введите почту')).toBeVisible();

		await screen.getByPlaceholder('Email').fill(REGISTRATION.data.email);

		await expect.element(screen.getByText('Введите почту')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Введите пароль')).toBeVisible();
		await expect.element(screen.getByText('Подтвердите пароль')).toBeVisible();
	});

	it('очищает ошибку подтверждения при изменении пароля', async () => {
		const screen = render(RegisterPage);
		await screen.getByPlaceholder('Email').fill(REGISTRATION.data.email);
		await screen.getByPlaceholder('Пароль', { exact: true }).fill(REGISTRATION.data.password);
		await screen.getByPlaceholder('Повторите пароль').fill(REGISTRATION.mismatchedPassword);
		await screen.getByRole('button', { name: 'Зарегистрировать' }).click();
		await expect.element(screen.getByText('Пароли не совпадают')).toBeVisible();

		await screen
			.getByPlaceholder('Пароль', { exact: true })
			.fill(REGISTRATION.data.confirmPassword);

		await expect.element(screen.getByText('Пароли не совпадают')).not.toBeInTheDocument();
	});
});
