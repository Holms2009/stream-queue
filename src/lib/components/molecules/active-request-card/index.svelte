<script lang="ts">
	import { Check, Volleyball } from '@lucide/svelte';

	import { Button } from '@atoms';

	type Props = {
		data: {
			title: string;
			author: string;
		};
		class?: string;
		canTakeNext: boolean;
		disabled?: boolean;
		onNext: () => void;
		onDefer: () => void;
		onComplete: () => void;
	};

	let {
		data,
		class: className = '',
		canTakeNext,
		disabled = false,
		onNext,
		onDefer,
		onComplete
	}: Props = $props();
</script>

<div class={['active-request-card', className]}>
	<div class="active-request-card__header">
		<h6 class="active-request-card__label">Сейчас выполняется</h6>
		<Volleyball class="active-request-card__icon" size={20} />
	</div>
	<h4 class="active-request-card__title">{data.title}</h4>
	<span class="active-request-card__author">Заказал: {data.author}</span>
	<div class="active-request-card__buttons">
		<Button class="active-request-card__button" variant="white" {disabled} onclick={onNext}>
			<Check class="active-request-card__checkmark" size={18} />{canTakeNext
				? 'Готово, следующий'
				: 'Готово'}
		</Button>
		<Button class="active-request-card__button" withBorder {disabled} onclick={onDefer}>
			Отложить
		</Button>
		{#if canTakeNext}
			<Button class="active-request-card__button" withBorder {disabled} onclick={onComplete}>
				Завершить
			</Button>
		{/if}
	</div>
</div>

<style lang="scss">
	@use './active-request-card.scss';
</style>
