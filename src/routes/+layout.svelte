<script lang="ts">
	import '../lib/styles/global.scss';
	import favicon from '@assets/svg/logo.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Stream Queue</title>
</svelte:head>

<main class="base-layout">
	<div class="base-layout__content">
		<div class="header"></div>
		{@render children()}
	</div>
</main>

<style lang="scss">
	@use './layout.scss';
</style>
