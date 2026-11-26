<script lang="ts">
	import { Hourglass, ListEnd, Play, SquareChevronsUp, Trash } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';

	type Props = {
		class?: string;
		index: number;
		data: { title: string; author: string; status: string };
		onMoveToEnd: () => void;
		onChangeStatus: (status: 'waiting' | 'deferred') => void;
		onActivate?: () => void;
		disabled?: boolean;
		onRemove?: () => void;
	};

	let {
		class: className = '',
		index,
		data,
		onMoveToEnd,
		onChangeStatus,
		onActivate = () => {},
		disabled = false,
		onRemove = () => {}
	}: Props = $props();
</script>

<div
	class={['requests-list-item', className]}
	in:fly={{ y: 10, opacity: 1 }}
	out:fade={{ duration: 200 }}
>
	<span class="requests-list-item__index">{index}</span>
	<div class="requests-list-item__text-wrapper">
		<h5 class="requests-list-item__title">{data.title}</h5>
		<span class="requests-list-item__author">{data.author}</span>
	</div>
	<div class="requests-list-item__controls">
		<button
			class="requests-list-item__button requests-list-item__button_activate"
			onclick={onActivate}
			{disabled}
			title="Взять"
		>
			<Play size="100%" />
		</button>
		<button class="requests-list-item__button" onclick={onMoveToEnd} title="В конец">
			<ListEnd size="100%" />
		</button>
		<button
			class="requests-list-item__button"
			onclick={() => onChangeStatus(data.status === 'deferred' ? 'waiting' : 'deferred')}
			{disabled}
			title={data.status === 'deferred' ? 'Вернуть в очередь' : 'Отложить'}
		>
			{#if data.status === 'deferred'}
				<SquareChevronsUp size="100%" />
			{:else}
				<Hourglass size="100%" />
			{/if}
		</button>
		<button
			class="requests-list-item__button requests-list-item__button_remove"
			onclick={onRemove}
			{disabled}
			title="Удалить"
		>
			<Trash size="100%" />
		</button>
	</div>
</div>

<style lang="scss">
	@use './requests-list-item.scss';
</style>
