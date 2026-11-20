<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import { slide } from 'svelte/transition';
	import { z } from 'zod';

	import { Button, Input, Loader } from '@atoms';
	import { passwordResetRequestSchema } from '../../lib/utils/auth/validation';
	import type { AppErrors } from '../../lib/utils/errors';

	let values = $state({ email: '' });
	let fieldErrors = $state<Record<string, string[]>>({});
	let formError = $state('');
	let pending = $state(false);
	let sent = $state(false);

	function clearEmailError() {
		delete fieldErrors.email;
	}

	const formEnhancement: SubmitFunction<
		{ success: true },
		{ status: 'invalid' | 'error'; errors: AppErrors }
	> = ({ cancel }) => {
		const validation = passwordResetRequestSchema.safeParse(values);

		formError = '';
		fieldErrors = {};

		if (!validation.success) {
			fieldErrors = z.flattenError(validation.error).fieldErrors;
			cancel();
			return;
		}

		pending = true;

		return async ({ result }) => {
			if (result.type === 'success') {
				sent = true;
			} else if (result.type === 'failure') {
				formError = result.data?.errors.formErrors[0] ?? '';
				fieldErrors = result.data?.errors.fieldErrors ?? {};
			} else if (result.type === 'error') {
				formError = 'Не удалось отправить запрос. Попробуйте позже.';
			}

			pending = false;
		};
	};
</script>

<svelte:head>
	<title>Восстановление пароля — Stream Queue</title>
</svelte:head>

<div class="forgot-password">
	{#if pending}
		<Loader />
	{/if}

	<h1 class="forgot-password__title">Восстановление пароля</h1>

	{#if sent}
		<p class="forgot-password__message">
			Если аккаунт с такой почтой существует, мы отправили письмо для сброса пароля.
		</p>
	{:else}
		{#if formError}
			<p class="forgot-password__form-error" transition:slide>{formError}</p>
		{/if}

		<form class="forgot-password__form" method="POST" novalidate use:enhance={formEnhancement}>
			<Input
				class="forgot-password__input"
				name="email"
				type="email"
				placeholder="Email"
				error={fieldErrors.email?.[0]}
				oninput={clearEmailError}
				bind:value={values.email}
			/>
			<Button class="forgot-password__button" type="submit">Отправить письмо</Button>
		</form>
	{/if}
	<a class="forgot-password__link" href={resolve('/login')}>Вернуться ко входу</a>
	<div class="forgot-password__light"></div>
</div>

<style lang="scss">
	@use './page.scss';
</style>
