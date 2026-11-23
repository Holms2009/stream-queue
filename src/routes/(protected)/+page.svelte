<script lang="ts">
	import { ActiveRequestCard, EmptyRequestCard, RequestsListItem } from '@molecules';
	import { RequestAddForm, UserMenu } from '@organisms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let activeRequest = $derived(data.requests.find((request) => request.status === 'active'));
	let waitingRequests = $derived(data.requests.filter((request) => request.status === 'waiting'));
	let deferredRequests = $derived(data.requests.filter((request) => request.status === 'deferred'));

	function handleRequestMove(itemId: unknown, moveType: unknown) {
		console.log('Move request', itemId, moveType);
	}
</script>

<div class="main">
	<UserMenu
		class="main__user-menu"
		user={data.user}
		error={form && 'error' in form ? form.error : undefined}
	/>

	{#if activeRequest}
		<ActiveRequestCard
			class="main__active-request"
			data={{ title: activeRequest.title, author: activeRequest.viewerName }}
		/>
	{:else}
		<EmptyRequestCard />
	{/if}

	<div class="main__list-header">
		<span class="main__list-header-label">Очередь</span>
		<span class="main__list-header-label">{waitingRequests.length} ожидают</span>
	</div>

	<div class="main__border"></div>
	<div class="main__requests-list">
		{#each waitingRequests as request, index (request.id)}
			<RequestsListItem
				data={{ ...request, author: request.viewerName }}
				index={index + 1}
				onMove={(moveType: string) => handleRequestMove(request.id, moveType)}
			/>
		{/each}
		{#if deferredRequests.length}
			{#each deferredRequests as request, index (request.id)}
				<RequestsListItem
					data={{ ...request, author: request.viewerName }}
					index={index + 1}
					onMove={(moveType: string) => handleRequestMove(request.id, moveType)}
				/>
			{/each}
		{/if}
	</div>
	<div class="main__border main__border_bottom"></div>
	<RequestAddForm class="main__request-add-form" queueId={data.queue.id} />
</div>

<style lang="scss">
	@use './page.scss';
</style>
