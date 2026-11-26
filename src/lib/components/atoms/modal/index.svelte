<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		children?: Snippet;
		onOpenChange?: (open: boolean) => void;
	};

	let { open = $bindable(false), title, description, children, onOpenChange }: Props = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay class="modal__overlay" />
		<Dialog.Content
			class="modal__content"
			{...!description ? { 'aria-describedby': undefined } : {}}
		>
			<div class="modal__header">
				<Dialog.Title class="modal__title">{title}</Dialog.Title>
				<Dialog.Close class="modal__close" aria-label="Закрыть">
					<X size="100%" />
				</Dialog.Close>
			</div>

			{#if description}
				<Dialog.Description class="modal__description">{description}</Dialog.Description>
			{/if}

			{@render children?.()}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style lang="scss">
	@use './modal.scss';
</style>
