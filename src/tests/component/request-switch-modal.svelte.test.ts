import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RequestSwitchModal from '../../lib/components/molecules/request-switch-modal/index.svelte';

describe('выбор действия с активным заказом', () => {
	it.each([
		{ button: 'Завершить', status: 'completed' },
		{ button: 'Отложить', status: 'deferred' }
	])('передаёт $status и закрывает окно', async ({ button, status }) => {
		const onSelect = vi.fn();
		const screen = render(RequestSwitchModal, { open: true, onSelect });
		await screen.getByRole('button', { name: button, exact: true }).click();
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(status);
		await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
	});
	it('закрывает окно без переключения', async () => {
		const onSelect = vi.fn();
		const screen = render(RequestSwitchModal, { open: true, onSelect });
		await screen.getByRole('button', { name: 'Не переключать' }).click();
		expect(onSelect).not.toHaveBeenCalled();
		await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
	});
});
