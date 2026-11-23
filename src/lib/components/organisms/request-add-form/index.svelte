<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { Plus } from '@lucide/svelte';
	import { z } from 'zod';

	import { Button, Input } from '@atoms';
	import type { AppErrors } from '../../../utils/errors';
	import { createRequestSchema } from '../../../utils/request/validation';

	type Props = { class?: string; queueId: number };

	let { class: className = '', queueId }: Props = $props();

	let values = $state({ title: '', viewerName: '' });
	let fieldErrors = $state<Record<string, string[]>>({});
	let pending = $state(false);

	function clearFieldError(event: Event & { currentTarget: HTMLInputElement }) {
		delete fieldErrors[event.currentTarget.name];
	}

	const formEnhancement: SubmitFunction<
		{ status: 'success' },
		{ status: 'invalid' | 'error'; errors: AppErrors }
	> = ({ cancel }) => {
		const validation = createRequestSchema.safeParse(values);
		fieldErrors = {};

		if (!validation.success) {
			fieldErrors = z.flattenError(validation.error).fieldErrors;
			cancel();
			return;
		}

		pending = true;

		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					await update({ reset: false });
					values = { title: '', viewerName: '' };
				} else if (result.type === 'failure') {
					const formError = result.data?.errors.formErrors[0];
					if (formError) console.error(formError);
					fieldErrors = result.data?.errors.fieldErrors ?? {};
				} else if (result.type === 'redirect') {
					await update();
				} else {
					console.error('Не удалось добавить заказ:', result.error);
				}
			} finally {
				pending = false;
			}
		};
	};
</script>

<form
	class={['request-add-form', className]}
	method="POST"
	action="?/addRequest"
	novalidate
	use:enhance={formEnhancement}
>
	<input type="hidden" name="queueId" value={queueId} />
	<h5 class="request-add-form__title">Добавить заказ</h5>
	<div class="request-add-form__inputs-wrapper">
		<Input
			class="request-add-form__title-input"
			name="title"
			bind:value={values.title}
			error={fieldErrors.title?.[0]}
			oninput={clearFieldError}
			placeholder="Клип, игра или другой заказ"
			autocomplete="off"
		/>
		<Input
			class="request-add-form__name-input"
			name="viewerName"
			bind:value={values.viewerName}
			error={fieldErrors.viewerName?.[0]}
			oninput={clearFieldError}
			placeholder="Ник зрителя"
			autocomplete="off"
		/>
		<Button class="request-add-form__button" type="submit" disabled={pending}>
			<Plus class="request-add-form__icon" size={18} />
			Добавить
		</Button>
	</div>
</form>

<style lang="scss">
	@use './request-add-form.scss';
</style>
