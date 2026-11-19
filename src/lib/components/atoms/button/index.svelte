<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		variant?: 'blue' | 'purple' | 'white';
		withBorder?: boolean;
	};

	let {
		children,
		type = 'button',
		variant = 'blue',
		withBorder = false,
		class: className,
		...rest
	}: Props = $props();
</script>

<button
	class={['button', `button_${variant}`, withBorder && 'button_with-border', className]}
	{type}
	{...rest}
>
	{@render children?.()}
</button>

<style lang="scss">
	@use './button.scss';
</style>
