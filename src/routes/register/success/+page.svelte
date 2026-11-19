<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { Button } from '@atoms';
</script>

<svelte:head>
	<title>Регистрация — Stream Queue</title>
</svelte:head>

<div class="register-success">
	<div class="register-success__container">
		<h1 class="register-success__title">Аккаунт создан</h1>
		<p class="register-success__message">Проверьте почту для подтверждения аккаунта.</p>
		<Button class="register-success__button" onclick={() => goto(resolve('/'))}>На главную</Button>
	</div>

	<div class="register-success__light"></div>
</div>

<style lang="scss">
	@use './page.scss';
</style>
