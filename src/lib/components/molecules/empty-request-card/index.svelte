<script lang="ts">
	import { Play, Volleyball } from '@lucide/svelte';

	type Props = {
		class?: string;
		canTakeRequest?: boolean;
		disabled?: boolean;
		onButtonClick?: () => void;
	};

	let {
		class: className = '',
		canTakeRequest = false,
		disabled = false,
		onButtonClick
	}: Props = $props();
</script>

<div class={['empty-request-card', className]}>
	<div class="empty-request-card__header">
		<Volleyball class="empty-request-card__icon" size={20} />
	</div>
	<button
		class="empty-request-card__button"
		title="Взять заказ"
		disabled={!canTakeRequest || disabled}
		onclick={onButtonClick}
	>
		<span>{canTakeRequest ? 'Взять заказ' : 'Нет заказов'}</span>
		{#if canTakeRequest}
			<Play size="30" />
		{/if}
	</button>
</div>

<style lang="scss">
	@use './empty-request-card.scss';
</style>
