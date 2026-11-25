import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QueuePage from '../../routes/(protected)/+page.svelte';
import { QUEUE } from '../mock/queue';

function renderPage(requests: typeof QUEUE.pageRequests) {
	return render(QueuePage, {
		data: { user: null, queue: { id: 1, createdAt: QUEUE.newerDate }, requests },
		params: {},
		form: null
	});
}

describe('главная страница очереди', () => {
	it('показывает активный заказ и ожидающие перед отложенными', async () => {
		const screen = renderPage(QUEUE.pageRequests);
		await expect.element(screen.getByText(QUEUE.activeTitle)).toBeVisible();
		await expect.element(screen.getByText('1 ожидают')).toBeVisible();
		await expect.element(screen.getByText(QUEUE.waitingTitle)).toBeVisible();
		await expect.element(screen.getByText(QUEUE.deferredTitle)).toBeVisible();
		await expect.element(screen.getByText(QUEUE.completedTitle)).not.toBeInTheDocument();
		const text = document.body.textContent ?? '';
		expect(text.indexOf(QUEUE.waitingTitle)).toBeLessThan(text.indexOf(QUEUE.deferredTitle));
	});
	it('показывает пустую карточку при отсутствии активного заказа', async () => {
		const screen = renderPage(QUEUE.pageRequests.filter(({ status }) => status !== 'active'));
		await expect.element(screen.getByRole('button', { name: 'Взять заказ' })).toBeVisible();
	});
});
