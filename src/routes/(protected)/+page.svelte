<script lang="ts">
	import { refreshAll } from '$app/navigation';
	import {
		ActiveRequestCard,
		ConfirmModal,
		EmptyRequestCard,
		RequestSwitchModal
	} from '@molecules';
	import { RequestAddForm, RequestsList, UserMenu } from '@organisms';
	import {
		activateRequest,
		changeRequestStatus,
		moveRequest as saveRequestMove
	} from '../../lib/utils/request/api';
	import {
		countQueueRequests,
		getNextRequestPosition,
		moveRequest,
		sortQueueRequests,
		type DragRequest
	} from '../../lib/utils/request';
	import type { PageProps } from './$types';
	import { scale } from 'svelte/transition';
	import { quadOut } from 'svelte/easing';
	import { getVerbForm } from '../../lib/utils';

	let { data, form }: PageProps = $props();

	let activeRequest = $derived(data.requests.find((request) => request.status === 'active'));
	type RequestMove = { requestId: number; position: number };
	let pendingMoves = $state<RequestMove[]>([]);
	let savingMoves = $state(false);
	let queueRequests = $derived(
		pendingMoves.reduce(
			(requests, move) => moveRequest(requests, move.requestId, move.position),
			sortQueueRequests(data.requests)
		)
	);
	let dragPreview = $state<DragRequest[] | null>(null);
	let displayedRequests: DragRequest[] = $derived(dragPreview ?? queueRequests);

	let counters = $derived(countQueueRequests(queueRequests));
	let activationPending = $state(false);
	let switchModalOpen = $state(false);
	let pendingConfirmation = $state<(() => void) | null>(null);
	let selectedRequestId = $state<number | null>(null);

	async function saveMoves() {
		if (savingMoves) return;

		let saved = 0;
		savingMoves = true;

		try {
			while (saved < pendingMoves.length) {
				await saveRequestMove({ queueId: data.queue.id, ...pendingMoves[saved] });
				saved++;
			}

			await refreshAll();

			pendingMoves = pendingMoves.slice(saved);
		} catch (error) {
			console.error('Не удалось переместить заказ:', error);
			pendingMoves = [];
			dragPreview = null;

			try {
				await refreshAll();
			} catch (refreshError) {
				console.error('Не удалось обновить очередь:', refreshError);
			}
		} finally {
			savingMoves = false;

			if (pendingMoves.length) void saveMoves();
		}
	}

	function handleMoveRequest(requestId: number, position: number) {
		pendingMoves = [...pendingMoves, { requestId, position }];
		void saveMoves();
	}

	function handlePreviewChange(items: DragRequest[] | null) {
		dragPreview = items;
	}

	function handleMoveToEnd(requestId: number) {
		const request = queueRequests.find((item) => item.id === requestId);
		if (request?.status === 'waiting' || request?.status === 'deferred') {
			handleMoveRequest(requestId, counters[request.status]);
		}
	}

	async function handleActivate(
		requestId: number,
		previousStatus: 'completed' | 'deferred' = 'completed'
	) {
		if (activationPending || savingMoves) return;

		activationPending = true;

		try {
			await activateRequest({ queueId: data.queue.id, requestId, previousStatus });
			await refreshAll();
		} catch (error) {
			console.error('Не удалось включить заказ:', error);
		} finally {
			activationPending = false;
		}
	}

	function handleSelectRequest(requestId: number) {
		if (activationPending || savingMoves) return;
		if (!activeRequest) {
			void handleActivate(requestId);
			return;
		}

		selectedRequestId = requestId;
		switchModalOpen = true;
	}

	function handleSwitchRequest(previousStatus: 'completed' | 'deferred') {
		if (selectedRequestId !== null) void handleActivate(selectedRequestId, previousStatus);

		selectedRequestId = null;
	}

	function handleTakeNext() {
		const request = queueRequests[0];

		if (request) void handleActivate(request.id);
	}

	async function handleChangeRequestStatus(
		requestId: number,
		status: 'completed' | 'deferred' | 'waiting' | 'deleted',
		position: number | null = null
	) {
		if (activationPending || savingMoves) return;

		activationPending = true;

		try {
			await changeRequestStatus({ queueId: data.queue.id, requestId, status, position });
			await refreshAll();
		} catch (error) {
			console.error('Не удалось изменить статус заказа:', error);
		} finally {
			activationPending = false;
		}
	}

	function requestConfirmation(
		requestId: number,
		status: 'completed' | 'deferred' | 'waiting' | 'deleted'
	) {
		pendingConfirmation = () => {
			void handleChangeRequestStatus(requestId, status);
			pendingConfirmation = null;
		};
	}

	function handleRemoveRequest(requestId: number) {
		requestConfirmation(requestId, 'deleted');
	}

	function handleCompleteAndTakeNext() {
		if (queueRequests.length) {
			handleTakeNext();
		} else if (activeRequest) {
			void handleChangeRequestStatus(activeRequest.id, 'completed');
		}
	}

	function handleQueueStatusChange(requestId: number, status: 'waiting' | 'deferred') {
		void handleChangeRequestStatus(
			requestId,
			status,
			getNextRequestPosition(queueRequests, status)
		);
	}
</script>

<RequestSwitchModal bind:open={switchModalOpen} onSelect={handleSwitchRequest} />
<ConfirmModal
	open={pendingConfirmation !== null}
	onConfirm={() => pendingConfirmation?.()}
	onClose={() => (pendingConfirmation = null)}
/>

<div class="main">
	<UserMenu
		class="main__user-menu"
		user={data.user}
		error={form && 'error' in form ? form.error : undefined}
	/>

	<div class="main__card-wrapper">
		{#key activeRequest?.id ?? 'empty'}
			<div transition:scale={{ start: 0.5, duration: 300, easing: quadOut }}>
				{#if activeRequest}
					<ActiveRequestCard
						class="main__active-request"
						data={{ title: activeRequest.title, author: activeRequest.viewerName }}
						canTakeNext={queueRequests.length > 0}
						disabled={activationPending || savingMoves}
						onNext={handleCompleteAndTakeNext}
						onDefer={() =>
							handleChangeRequestStatus(
								activeRequest.id,
								'deferred',
								getNextRequestPosition(queueRequests, 'deferred')
							)}
						onComplete={() => handleChangeRequestStatus(activeRequest.id, 'completed')}
					/>
				{:else}
					<EmptyRequestCard
						canTakeRequest={queueRequests.length > 0}
						disabled={activationPending || savingMoves}
						onButtonClick={handleTakeNext}
					/>
				{/if}
			</div>
		{/key}
	</div>

	<div class="main__list-header">
		<span class="main__list-header-label">Очередь</span>
		<div class="main__counters">
			<span class="main__list-header-label">
				{counters.waiting}
				{getVerbForm(counters.waiting, 'ожидает', 'ожидают')}
			</span>
			{#if counters.deferred}
				<span class="main__list-header-label">
					{counters.deferred}
					{getVerbForm(counters.deferred, 'отложен', 'отложено')}
				</span>
			{/if}
		</div>
	</div>

	<div class="main__border"></div>
	<RequestsList
		requests={queueRequests}
		items={displayedRequests}
		disabled={activationPending || savingMoves}
		dragDisabled={activationPending}
		onPreviewChange={handlePreviewChange}
		onMove={handleMoveRequest}
		onActivate={handleSelectRequest}
		onRemove={handleRemoveRequest}
		onMoveToEnd={handleMoveToEnd}
		onChangeStatus={handleQueueStatusChange}
	/>
	<div class="main__border main__border_bottom"></div>
	<RequestAddForm class="main__request-add-form" queueId={data.queue.id} />
</div>

<style lang="scss">
	@use './page.scss';
</style>
