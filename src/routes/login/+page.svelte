<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import { slide } from 'svelte/transition';
	import { z } from 'zod';

	import { Button, Input, Loader } from '@atoms';
	import { loginSchema } from '../../lib/utils/auth/validation';
	import type { ActionData } from './$types';

	let values = $state({ email: '', password: '' });
	let fieldErrors = $state<Record<string, string[]>>({});
	let formError = $state('');
	let pending = $state(false);

	function clearFieldError(event: Event & { currentTarget: HTMLInputElement }) {
		delete fieldErrors[event.currentTarget.name];
	}

	const formEnhancement: SubmitFunction<undefined, NonNullable<ActionData>> = ({ cancel }) => {
		const validation = loginSchema.safeParse(values);

		formError = '';
		fieldErrors = {};

		if (!validation.success) {
			fieldErrors = z.flattenError(validation.error).fieldErrors;
			cancel();
			return;
		}

		pending = true;

		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				await update();
			} else if (result.type === 'failure') {
				formError = result.data?.errors?.formErrors[0] ?? '';
				fieldErrors = result.data?.errors?.fieldErrors ?? {};
			} else if (result.type === 'error') {
				formError = 'Не удалось войти. Попробуйте позже.';
			}

			pending = false;
		};
	};
</script>

<svelte:head>
	<title>Вход — Stream Queue</title>
</svelte:head>

<div class="login">
	{#if pending}
		<Loader />
	{/if}

	<h1 class="login__title">Вход</h1>

	{#if formError}
		<p class="login__form-error" transition:slide>{formError}</p>
	{/if}

	<form class="login__form" method="POST" novalidate use:enhance={formEnhancement}>
		<Input
			class="login__input"
			name="email"
			type="email"
			placeholder="Email"
			error={fieldErrors.email?.[0]}
			oninput={clearFieldError}
			bind:value={values.email}
		/>
		<Input
			class="login__input"
			name="password"
			type="password"
			placeholder="Пароль"
			error={fieldErrors.password?.[0]}
			oninput={clearFieldError}
			bind:value={values.password}
		/>
		<Button class="login__button" type="submit">Войти</Button>
	</form>
	<div class="login__links">
		<a class="login__link" href={resolve('/register')}>Создать аккаунт</a>
		<a class="login__link" href={resolve('/forgot-password')}>Забыли пароль?</a>
	</div>
	<div class="login__light"></div>
</div>

<style lang="scss">
	@use './page.scss';
</style>
