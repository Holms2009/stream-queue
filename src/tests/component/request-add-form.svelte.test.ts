import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
// SvelteKit не инициализирует транспорт при отдельном рендеринге страницы в тесте.
// @ts-expect-error У внутреннего модуля нет декларации типов.
import { init_transport } from '../../../node_modules/@sveltejs/kit/src/runtime/app/internal/transport.js';
import RequestAddForm from '../../lib/components/organisms/request-add-form/index.svelte';
import { QUEUE } from '../mock/queue';

init_transport({});

describe('форма добавления заказа', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});
	it('показывает ошибки пустых полей и очищает их при изменении', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const screen = render(RequestAddForm, { queueId: QUEUE.queueId });
		await screen.getByRole('button', { name: 'Добавить' }).click();
		await expect.element(screen.getByText('Введите название заказа')).toBeVisible();
		await expect.element(screen.getByText('Введите ник зрителя')).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
		await screen.getByPlaceholder('Клип, игра или другой заказ').fill(QUEUE.title);
		await expect.element(screen.getByText('Введите название заказа')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Введите ник зрителя')).toBeVisible();
		await screen.getByPlaceholder('Ник зрителя').fill(QUEUE.viewerName);
		await expect.element(screen.getByText('Введите ник зрителя')).not.toBeInTheDocument();
	});
	it('при ожидании блокирует только кнопку, а при ошибке сохраняет значения и пишет в консоль', async () => {
		let resolveResponse!: (response: Response) => void;
		vi.stubGlobal(
			'fetch',
			vi.fn().mockReturnValue(
				new Promise<Response>((resolve) => {
					resolveResponse = resolve;
				})
			)
		);
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const screen = render(RequestAddForm, { queueId: QUEUE.queueId });
		await screen.getByPlaceholder('Клип, игра или другой заказ').fill(QUEUE.title);
		await screen.getByPlaceholder('Ник зрителя').fill(QUEUE.viewerName);
		await screen.getByRole('button', { name: 'Добавить' }).click();
		await expect.element(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
		await expect.element(screen.getByPlaceholder('Ник зрителя')).toBeEnabled();
		await expect.element(screen.getByRole('status', { name: 'Загрузка' })).not.toBeInTheDocument();
		resolveResponse(Response.json(QUEUE.failureResponse, { status: 500 }));
		await expect.element(screen.getByRole('button', { name: 'Добавить' })).toBeEnabled();
		await expect
			.element(screen.getByPlaceholder('Клип, игра или другой заказ'))
			.toHaveValue(QUEUE.title);
		await expect.element(screen.getByPlaceholder('Ник зрителя')).toHaveValue(QUEUE.viewerName);
		expect(log).toHaveBeenCalledWith(QUEUE.formError);
	});
});
