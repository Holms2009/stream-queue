<script lang="ts">
	import { refreshAll } from '$app/navigation';
	import {
		ActiveRequestCard,
		ConfirmModal,
		EmptyRequestCard,
		RequestsListItem,
		RequestSwitchModal
	} from '@molecules';
	import { RequestAddForm, UserMenu } from '@organisms';
	import type { PageProps } from './$types';
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { quadOut } from 'svelte/easing';

	let { data, form }: PageProps = $props();
	let activeRequest = $derived(data.requests.find((request) => request.status === 'active'));
	let waitingRequests = $derived(data.requests.filter((request) => request.status === 'waiting'));
	let deferredRequests = $derived(data.requests.filter((request) => request.status === 'deferred'));
	let activationPending = $state(false);
	let switchModalOpen = $state(false);
	let confirmModalOpen = $state(false);
	let pendingAction = $state<{ requestId: number; status: 'canceled' | 'deleted' } | null>(null);
	let selectedRequestId = $state<number | null>(null);

	async function handleActivate(
		requestId: number,
		previousStatus: 'completed' | 'deferred' = 'completed'
	) {
		if (activationPending) return;
		activationPending = true;
		try {
			const response = await fetch('/api/requests/activate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ queueId: data.queue.id, requestId, previousStatus })
			});

			if (!response.ok) {
				console.error('Не удалось включить заказ:', await response.json());
				return;
			}

			await refreshAll();
		} catch (error) {
			console.error('Не удалось включить заказ:', error);
		} finally {
			activationPending = false;
		}
	}

	function handleSelectRequest(requestId: number) {
		if (activationPending) return;
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
		const request = waitingRequests[0] ?? deferredRequests[0];
		if (request) void handleActivate(request.id);
	}

	async function handleChangeRequestStatus(
		requestId: number,
		status: 'completed' | 'deferred' | 'waiting' | 'canceled' | 'deleted',
		position: number | null = null
	) {
		if (activationPending) return;

		activationPending = true;

		try {
			const response = await fetch('/api/requests/change-status', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ queueId: data.queue.id, requestId, status, position })
			});
			if (!response.ok) {
				console.error('Не удалось изменить статус заказа:', await response.json());
				return;
			}

			await refreshAll();
		} catch (error) {
			console.error('Не удалось изменить статус заказа:', error);
		} finally {
			activationPending = false;
		}
	}

	function requestConfirmation(requestId: number, status: 'canceled' | 'deleted') {
		if (activationPending) return;
		pendingAction = { requestId, status };
		confirmModalOpen = true;
	}

	function handleConfirm() {
		if (pendingAction)
			void handleChangeRequestStatus(pendingAction.requestId, pendingAction.status);
		pendingAction = null;
	}

	function handleCompleteAndTakeNext() {
		if (waitingRequests.length || deferredRequests.length) handleTakeNext();
		else if (activeRequest) void handleChangeRequestStatus(activeRequest.id, 'completed');
	}

	function handleRequestMove(itemId: number, moveType: string) {
		if (moveType === 'return-to-queue') {
			void handleChangeRequestStatus(
				itemId,
				'waiting',
				Math.max(0, ...waitingRequests.map((request) => request.position ?? 0)) + 1
			);

			return;
		}

		if (moveType === 'deffer') {
			void handleChangeRequestStatus(
				itemId,
				'deferred',
				Math.max(0, ...deferredRequests.map((request) => request.position ?? 0)) + 1
			);

			return;
		}

		console.log('Move request', itemId, moveType);
	}
</script>

<RequestSwitchModal bind:open={switchModalOpen} onSelect={handleSwitchRequest} />
<ConfirmModal bind:open={confirmModalOpen} onConfirm={handleConfirm} />

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
						canTakeNext={waitingRequests.length > 0 || deferredRequests.length > 0}
						disabled={activationPending}
						onNext={handleCompleteAndTakeNext}
						onDefer={() =>
							handleChangeRequestStatus(
								activeRequest.id,
								'deferred',
								Math.max(0, ...deferredRequests.map((request) => request.position ?? 0)) + 1
							)}
						onComplete={() => handleChangeRequestStatus(activeRequest.id, 'completed')}
					/>
				{:else}
					<EmptyRequestCard
						canTakeRequest={waitingRequests.length > 0 || deferredRequests.length > 0}
						disabled={activationPending}
						onButtonClick={handleTakeNext}
					/>
				{/if}
			</div>
		{/key}
	</div>

	<div class="main__list-header">
		<span class="main__list-header-label">Очередь</span>
		<span class="main__list-header-label">{waitingRequests.length} ожидают</span>
	</div>

	<div class="main__border"></div>
	<div class="main__requests-list">
		{#each waitingRequests as request, index (request.id)}
			<div animate:flip={{ delay: 100, duration: 300 }}>
				<RequestsListItem
					data={{ ...request, author: request.viewerName }}
					index={index + 1}
					onActivate={() => handleSelectRequest(request.id)}
					onCancel={() => requestConfirmation(request.id, 'canceled')}
					onRemove={() => requestConfirmation(request.id, 'deleted')}
					disabled={activationPending}
					onMove={(moveType: string) => handleRequestMove(request.id, moveType)}
				/>
			</div>
		{/each}

		{#if deferredRequests.length}
			{#each deferredRequests as request, index (request.id)}
				<div animate:flip={{ delay: 100, duration: 300 }}>
					<RequestsListItem
						data={{ ...request, author: request.viewerName }}
						index={index + 1}
						onActivate={() => handleSelectRequest(request.id)}
						onCancel={() => requestConfirmation(request.id, 'canceled')}
						onRemove={() => requestConfirmation(request.id, 'deleted')}
						disabled={activationPending}
						onMove={(moveType: string) => handleRequestMove(request.id, moveType)}
					/>
				</div>
			{/each}
		{/if}
	</div>
	<div class="main__border main__border_bottom"></div>
	<RequestAddForm class="main__request-add-form" queueId={data.queue.id} />
</div>

<style lang="scss">
	@use './page.scss';
</style>
