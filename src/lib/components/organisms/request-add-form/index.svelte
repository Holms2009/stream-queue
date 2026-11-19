<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { Button, Input } from '@atoms';

	let { class: className = '' } = $props();
</script>

<form class={['request-add-form', className]} action="">
	<h5 class="request-add-form__title">Добавить заказ</h5>
	<div class="request-add-form__inputs-wrapper">
		<Input
			class="request-add-form__title-input"
			name="title"
			placeholder="Клип, игра или другой заказ"
			autocomplete="off"
		/>
		<Input
			class="request-add-form__name-input"
			name="name"
			placeholder="Ник зрителя"
			autocomplete="off"
		/>
		<Button class="request-add-form__button">
			<Plus class="request-add-form__icon" size={18} />
			Добавить
		</Button>
	</div>
</form>

<style lang="scss">
	@use './request-add-form.scss';
</style>
