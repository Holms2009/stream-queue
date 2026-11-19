<script lang="ts">
	import { ChevronDown, ChevronUp } from '@lucide/svelte';

	const { class: className = '', index, data, onMove } = $props();
</script>

<div class={['requests-list-item', className]}>
	<span class="requests-list-item__index">{index}</span>
	<div class="requests-list-item__text-wrapper">
		<h5 class="requests-list-item__title">{data.title}</h5>
		<span class="requests-list-item__author">{data.author}</span>
	</div>
	<div class="requests-list-item__controls">
		<div class="requests-list-item__position-btns">
			<button
				class="requests-list-item__move requests-list-item__move_up"
				onclick={() => onMove('up')}
			>
				<ChevronUp size="100%" />
			</button>
			<button
				class="requests-list-item__move requests-list-item__move_up"
				onclick={() => onMove('down')}
			>
				<ChevronDown size="100%" />
			</button>
		</div>
		<button class="requests-list-item__to-end" onclick={() => onMove('to-end')}>В конец</button>
	</div>
</div>

<style lang="scss">
	@use './requests-list-item.scss';
</style>
