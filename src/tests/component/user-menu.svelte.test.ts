import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import UserMenu from '../../lib/components/organisms/user-menu/index.svelte';
import { USER_MENU } from '../mock/user-menu';

describe('меню пользователя', () => {
	it('открывается по кнопке и закрывается по Escape', async () => {
		const screen = render(UserMenu, { user: USER_MENU.user });
		const trigger = screen.getByRole('button', { name: 'Меню пользователя' });

		await trigger.click();
		await expect.element(screen.getByRole('menuitem', { name: 'Выйти' })).toBeVisible();

		await userEvent.keyboard('{Escape}');
		await expect.element(trigger).toHaveAttribute('data-state', 'closed');
	});

	it('показывает имя пользователя и его аватар', async () => {
		const screen = render(UserMenu, { user: USER_MENU.user });

		await screen.getByRole('button', { name: 'Меню пользователя' }).click();

		await expect.element(screen.getByText(USER_MENU.user.displayName)).toBeVisible();
		expect(document.querySelector('.user-menu__avatar')?.getAttribute('src')).toBe(
			USER_MENU.user.avatar
		);
	});

	it('показывает почту и запасную иконку, если имя и аватар не заданы', async () => {
		const screen = render(UserMenu, { user: USER_MENU.withoutName });

		await screen.getByRole('button', { name: 'Меню пользователя' }).click();

		await expect.element(screen.getByText(USER_MENU.withoutName.email)).toBeVisible();
		expect(document.querySelector('.user-menu__avatar')?.tagName.toLowerCase()).toBe('svg');
	});

	it('содержит ссылку на настройки', async () => {
		const screen = render(UserMenu, { user: USER_MENU.user });

		await screen.getByRole('button', { name: 'Меню пользователя' }).click();

		await expect
			.element(screen.getByRole('menuitem', { name: 'Настройки' }))
			.toHaveAttribute('href', '/settings');
	});

	it('показывает ошибку выхода после закрытия меню', async () => {
		const screen = render(UserMenu, { user: USER_MENU.user, error: USER_MENU.error });

		await screen.getByRole('button', { name: 'Меню пользователя' }).click();
		await userEvent.keyboard('{Escape}');

		await expect.element(screen.getByRole('alert')).toHaveTextContent(USER_MENU.error);
	});
});
