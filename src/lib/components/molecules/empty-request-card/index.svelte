<script lang="ts">
	import { Play, Volleyball } from '@lucide/svelte';

	type Props = {
		class?: string;
	};

	let { class: className = '' }: Props = $props();
</script>

<div class={['empty-request-card', className]}>
	<div class="empty-request-card__header">
		<Volleyball class="empty-request-card__icon" size={20} />
	</div>
	<h4 class="empty-request-card__title">Нет активного заказа</h4>
	<button class="empty-request-card__button" title="Взять заказ"><Play size="100%" /></button>
</div>

<style lang="scss">
	@use './empty-request-card.scss';
</style>
