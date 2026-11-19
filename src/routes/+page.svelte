<script lang="ts">
	import { ActiveRequestCard, EmptyRequestCard, RequestsListItem } from '@molecules';
	import { RequestAddForm } from '@organisms';

	let activeRequest = $state({ title: 'Клип — Spiritbox', author: 'Banifator' });

	const requestsMock = [
		{ title: 'Клип — Spiritbox', author: 'Banifator' },
		{ title: 'Клип — Bring Me The Horizon', author: 'Moonlight' },
		{ title: 'Игра — Hollow Knight', author: 'Shade' },
		{ title: 'Клип — Linkin Park', author: 'Neko' },
		{ title: 'Игра — Hades', author: 'Phoenix' },
		{ title: 'Клип — Architects', author: 'Storm' },
		{ title: 'Игра — Celeste', author: 'Cloud' },
		{ title: 'Клип — Sleep Token', author: 'Raven' },
		{ title: 'Игра — Stardew Valley', author: 'Luna' },
		{ title: 'Клип — Muse', author: 'Atlas' }
	];

	function handleRequestMove(itemId: unknown, moveType: unknown) {
		console.log('Move request', itemId, moveType);
	}
</script>

<div class="main">
	{#if activeRequest}
		<ActiveRequestCard class="main__active-request" data={activeRequest} />
	{:else}
		<EmptyRequestCard />
	{/if}
	<div class="main__list-header">
		<span class="main__list-header-label">Очередь</span>
		<span class="main__list-header-label">{requestsMock.length} ожидают</span>
	</div>
	<div class="main__requests-list">
		{#each requestsMock as request, index (index)}
			<RequestsListItem data={request} index={index + 1} onMove={handleRequestMove} />
		{/each}
	</div>
	<RequestAddForm class="main__request-add-form" />
</div>

<style lang="scss">
	@use './page.scss';
</style>
