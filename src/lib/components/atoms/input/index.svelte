<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { slide } from 'svelte/transition';

	type InputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
	type Props = Omit<HTMLInputAttributes, 'type' | 'value'> & {
		type?: InputType;
		value?: string;
		error?: string;
	};

	let { type = 'text', value = $bindable(''), class: className, error, ...rest }: Props = $props();
	let showPassword = $state(false);
	let actualInputType = $derived(type === 'password' ? (showPassword ? 'text' : type) : type);

	$effect(() => {
		if (showPassword && (rest.disabled || !value)) showPassword = false;
	});
</script>

<div class={['input', className, error ? 'input_error' : '']}>
	<input class="input__field" type={actualInputType} bind:value {...rest} />
	{#if type === 'password'}
		<button
			class="input__show-hide"
			type="button"
			onclick={() => (showPassword = !showPassword)}
			disabled={!value || rest.disabled}
			tabindex={-1}
		>
			{#if showPassword}
				<EyeOff size="100%" />
			{:else}
				<Eye size="100%" />
			{/if}
		</button>
	{/if}
	{#if error}
		<p class="input__error" transition:slide>{error}</p>
	{/if}
</div>

<style lang="scss">
	@use './input.scss';
</style>
