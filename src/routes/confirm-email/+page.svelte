<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { Button } from '@atoms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Подтверждение почты — Stream Queue</title>
</svelte:head>

<div class="confirm-email">
	<div class="confirm-email__container">
		{#if !form}
			<h1 class="confirm-email__title">Подтверждение почты</h1>
			<p class="confirm-email__message">Нажмите кнопку, чтобы подтвердить почту.</p>
			<form method="POST">
				<input type="hidden" name="token" value={page.url.searchParams.get('token') ?? ''} />
				<Button class="confirm-email__button" type="submit">Подтвердить почту</Button>
			</form>
		{:else}
			{#if form.status === 'success'}
				<h1 class="confirm-email__title">Почта подтверждена</h1>
			{:else}
				<h1 class="confirm-email__title">Не удалось подтвердить почту</h1>

				{#if form.status === 'expired-token'}
					<p class="confirm-email__message">Срок действия ссылки истёк.</p>
				{:else if form.status === 'invalid-token'}
					<p class="confirm-email__message">Ссылка недействительна или уже использована.</p>
				{:else}
					<p class="confirm-email__message">Произошла ошибка. Попробуйте позже.</p>
				{/if}
			{/if}
			<Button class="confirm-email__button" onclick={() => goto(resolve('/(protected)'))}>
				На главную
			</Button>
		{/if}
	</div>

	<div class="confirm-email__light"></div>
</div>

<style lang="scss">
	@use './page.scss';
</style>
