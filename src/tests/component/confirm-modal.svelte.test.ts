import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import ConfirmModal from '../../lib/components/molecules/confirm-modal/index.svelte';

describe('модальное подтверждение', () => {
	it('подтверждает действие и закрывает окно', async () => {
		const onConfirm = vi.fn();
		const screen = render(ConfirmModal, { open: true, onConfirm });
		await screen.getByRole('button', { name: 'Ок', exact: true }).click();
		expect(onConfirm).toHaveBeenCalledExactlyOnceWith();
		await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
	});
	it('закрывает окно без подтверждения', async () => {
		const onConfirm = vi.fn();
		const screen = render(ConfirmModal, { open: true, onConfirm });
		await screen.getByRole('button', { name: 'Отмена', exact: true }).click();
		expect(onConfirm).not.toHaveBeenCalled();
		await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
	});
});
