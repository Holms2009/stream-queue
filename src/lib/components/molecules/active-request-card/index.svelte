<script lang="ts">
	import { Check, Volleyball } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	import { Button } from '@atoms';

	type Props = {
		data: {
			title: string;
			author: string;
		};
		class?: string;
	};

	let { data, class: className = '' }: Props = $props();
</script>

<div class={['active-request-card', className]} transition:fade>
	<div class="active-request-card__header">
		<h6 class="active-request-card__label">Сейчас выполняется</h6>
		<Volleyball class="active-request-card__icon" size={20} />
	</div>
	<h4 class="active-request-card__title">{data.title}</h4>
	<span class="active-request-card__author">Заказал: {data.author}</span>
	<div class="active-request-card__buttons">
		<Button class="active-request-card__button" variant="white">
			<Check class="active-request-card__checkmark" size={18} />Готово, следующий
		</Button>
		<Button class="active-request-card__button" withBorder>Отложить</Button>
	</div>
</div>

<style lang="scss">
	@use './active-request-card.scss';
</style>
