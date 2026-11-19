<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import { slide } from 'svelte/transition';
	import { z } from 'zod';

	import { Button, Input, Loader } from '@atoms';
	import { registrationSchema } from '../../lib/utils/auth/validation';
	import type { ActionData } from './$types';

	let values = $state({ email: '', password: '', confirmPassword: '' });
	let fieldErrors = $state<Record<string, string[]>>({});
	let formError = $state('');
	let pending = $state(false);

	function clearFieldError(event: Event & { currentTarget: HTMLInputElement }) {
		const { name } = event.currentTarget;

		delete fieldErrors[name];

		if (name === 'password') delete fieldErrors.confirmPassword;
	}

	const formEnhancement: SubmitFunction<undefined, NonNullable<ActionData>> = ({ cancel }) => {
		const validation = registrationSchema.safeParse(values);

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
				formError = 'Не удалось создать аккаунт. Попробуйте позже.';
			}

			pending = false;
		};
	};
</script>

<svelte:head>
	<title>Регистрация — Stream Queue</title>
</svelte:head>

<div class="register">
	{#if pending}
		<Loader />
	{/if}

	<h1 class="register__title">Регистрация</h1>

	{#if formError}
		<p class="register__form-error" transition:slide>{formError}</p>
	{/if}

	<form class="register__form" method="POST" novalidate use:enhance={formEnhancement}>
		<Input
			class="register__input"
			name="email"
			type="email"
			placeholder="Email"
			error={fieldErrors.email?.[0]}
			oninput={clearFieldError}
			bind:value={values.email}
		/>
		<Input
			class="register__input"
			name="password"
			type="password"
			placeholder="Пароль"
			error={fieldErrors.password?.[0]}
			oninput={clearFieldError}
			bind:value={values.password}
		/>
		<Input
			class="register__input"
			name="confirmPassword"
			type="password"
			placeholder="Повторите пароль"
			error={fieldErrors.confirmPassword?.[0]}
			oninput={clearFieldError}
			bind:value={values.confirmPassword}
		/>
		<Button class="register__button" type="submit">Зарегистрировать</Button>
	</form>
	<div class="register__links">
		<a class="register__link" href={resolve('/login')}>Уже зарегистрированы?</a>
	</div>
	<div class="register__light"></div>
</div>

<style lang="scss">
	@use './page.scss';
</style>
