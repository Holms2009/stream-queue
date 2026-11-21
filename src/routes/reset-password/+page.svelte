<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { z } from 'zod';

	import { Button, Input, Loader } from '@atoms';
	import { resetPasswordSchema } from '../../lib/utils/auth/validation';
	import type { ActionData, PageProps } from './$types';

	let { data }: PageProps = $props();
	let values = $state({ password: '', confirmPassword: '' });
	let fieldErrors = $state<Record<string, string[]>>({});
	let formError = $state('');
	let pending = $state(false);
	let outcome = $state<'success' | 'invalid-token' | null>(null);
	let status = $derived(outcome ?? data.status);

	function clearFieldError(event: Event & { currentTarget: HTMLInputElement }) {
		const { name } = event.currentTarget;
		delete fieldErrors[name];
		if (name === 'password') delete fieldErrors.confirmPassword;
	}

	const formEnhancement: SubmitFunction<{ status: 'success' }, NonNullable<ActionData>> = ({
		cancel
	}) => {
		const validation = resetPasswordSchema.safeParse(values);
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
				outcome = 'success';
			} else if (result.type === 'failure') {
				if (result.data?.status === 'invalid-token') outcome = 'invalid-token';
				else if (result.data?.status === 'invalid') fieldErrors = result.data.errors.fieldErrors;
				else formError = 'Не удалось изменить пароль. Попробуйте позже.';
			} else if (result.type === 'error') {
				formError = 'Не удалось изменить пароль. Попробуйте позже.';
			}
			pending = false;
		};
	};
</script>

<svelte:head>
	<title>Новый пароль — Stream Queue</title>
</svelte:head>

<div class="reset-password">
	{#if pending}<Loader />{/if}
	{#if status === 'success'}
		<h1 class="reset-password__title">Пароль изменён</h1>
		<p class="reset-password__message">Теперь вы можете войти с новым паролем.</p>
		<a class="reset-password__link" href={resolve('/login')}>Перейти ко входу</a>
	{:else if status === 'invalid-token'}
		<h1 class="reset-password__title">Ссылка недействительна</h1>
		<p class="reset-password__message">Ссылка недействительна, устарела или уже использована.</p>
		<a class="reset-password__link" href={resolve('/forgot-password')}>Запросить новую ссылку</a>
	{:else if status === 'error'}
		<h1 class="reset-password__title">Не удалось проверить ссылку</h1>
		<p class="reset-password__message">Произошла ошибка. Попробуйте позже.</p>
	{:else}
		<h1 class="reset-password__title">Новый пароль</h1>
		{#if formError}<p class="reset-password__form-error" transition:slide>{formError}</p>{/if}
		<form class="reset-password__form" method="POST" novalidate use:enhance={formEnhancement}>
			<input type="hidden" name="token" value={page.url.searchParams.get('token') ?? ''} />
			<Input
				class="reset-password__input"
				name="password"
				type="password"
				placeholder="Пароль"
				autocomplete="new-password"
				error={fieldErrors.password?.[0]}
				oninput={clearFieldError}
				bind:value={values.password}
			/>
			<Input
				class="reset-password__input"
				name="confirmPassword"
				type="password"
				placeholder="Повторите пароль"
				autocomplete="new-password"
				error={fieldErrors.confirmPassword?.[0]}
				oninput={clearFieldError}
				bind:value={values.confirmPassword}
			/>
			<Button class="reset-password__button" type="submit">Изменить пароль</Button>
		</form>
	{/if}
	<div class="reset-password__light"></div>
</div>

<style lang="scss">
	@use './page.scss';
</style>
