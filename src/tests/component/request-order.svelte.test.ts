import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import QueuePage from '../../routes/(protected)/+page.svelte';
import { moveRequest } from '../../lib/utils/request/api';
import { refreshAll } from '$app/navigation';
import { QUEUE } from '../mock/queue';

vi.mock('../../lib/utils/request/api', () => ({
	activateRequest: vi.fn(), changeRequestStatus: vi.fn(), moveRequest: vi.fn()
}));
vi.mock('$app/navigation', () => ({
	refreshAll: vi.fn(), afterNavigate: vi.fn(), beforeNavigate: vi.fn(), onNavigate: vi.fn(),
	goto: vi.fn(), invalidate: vi.fn(), invalidateAll: vi.fn(), disableScrollHandling: vi.fn(),
	preloadData: vi.fn(), preloadCode: vi.fn(), pushState: vi.fn(), replaceState: vi.fn()
}));

const requests = [
	{ id: 10, title: 'Ожидающий 1', viewerName: 'Зритель', description: null, status: 'waiting' as const, position: 1 },
	{ id: 11, title: 'Ожидающий 2', viewerName: 'Зритель', description: null, status: 'waiting' as const, position: 2 },
	{ id: 12, title: 'Ожидающий 3', viewerName: 'Зритель', description: null, status: 'waiting' as const, position: 3 },
	{ id: 13, title: 'Отложенный 1', viewerName: 'Зритель', description: null, status: 'deferred' as const, position: 1 },
	{ id: 14, title: 'Отложенный 2', viewerName: 'Зритель', description: null, status: 'deferred' as const, position: 2 }
];

function renderPage() {
	return render(QueuePage, { data: { user: null, queue: { id: 1, createdAt: QUEUE.newerDate }, requests }, params: {}, form: null });
}

function order() {
	return [...document.querySelectorAll('.requests-list-item__title')].map((element) => element.textContent?.trim());
}

function pending<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
	return { promise, resolve, reject };
}

beforeEach(() => { vi.mocked(refreshAll).mockResolvedValue(undefined); });
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('перемещение заказов на странице', () => {
	it('сразу показывает заказ в конце, пока сервер ещё отвечает', async () => {
		const request = pending<void>();
		vi.mocked(moveRequest).mockReturnValue(request.promise);
		renderPage();
		const button = document.querySelector('[aria-label="Ожидающий 1"] button[title="В конец"]') as HTMLButtonElement;
		await userEvent.click(button);
		await expect.poll(order).toEqual(['Ожидающий 2', 'Ожидающий 3', 'Ожидающий 1', 'Отложенный 1', 'Отложенный 2']);
		expect(moveRequest).toHaveBeenCalledWith({ queueId: 1, requestId: 10, position: 3 });
		request.resolve();
		await expect.poll(() => vi.mocked(refreshAll).mock.calls.length).toBe(1);
	});

	it('при ошибке восстанавливает порядок и обновляет данные', async () => {
		const request = pending<void>();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(moveRequest).mockReturnValue(request.promise);
		renderPage();
		await userEvent.click(document.querySelector('[aria-label="Ожидающий 1"] button[title="В конец"]') as HTMLButtonElement);
		await userEvent.click(document.querySelector('[aria-label="Ожидающий 2"] button[title="В конец"]') as HTMLButtonElement);
		request.reject(new Error('Ошибка сохранения'));
		await expect.poll(order).toEqual(requests.map((item) => item.title));
		await expect.poll(() => vi.mocked(refreshAll).mock.calls.length).toBe(1);
		expect(moveRequest).toHaveBeenCalledTimes(1);
	});

	it('отправляет быстрые перемещения последовательно', async () => {
		const first = pending<void>();
		const second = pending<void>();
		vi.mocked(moveRequest).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		renderPage();
		await userEvent.click(document.querySelector('[aria-label="Ожидающий 1"] button[title="В конец"]') as HTMLButtonElement);
		await userEvent.click(document.querySelector('[aria-label="Ожидающий 2"] button[title="В конец"]') as HTMLButtonElement);
		expect(moveRequest).toHaveBeenCalledTimes(1);
		first.resolve();
		await expect.poll(() => vi.mocked(moveRequest).mock.calls.length).toBe(2);
		expect(moveRequest).toHaveBeenNthCalledWith(2, { queueId: 1, requestId: 11, position: 3 });
		second.resolve();
		await expect.poll(() => vi.mocked(refreshAll).mock.calls.length).toBe(1);
	});
});
