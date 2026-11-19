<script lang="ts">
	import { LoaderCircle } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
</script>

<div class="loader" role="status" aria-label="Загрузка" transition:fade>
	<div class="loader__icon">
		<LoaderCircle size="100%" />
	</div>
</div>

<style lang="scss">
	@use './loader.scss';
</style>
