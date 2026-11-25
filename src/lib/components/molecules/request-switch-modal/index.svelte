<script lang="ts">
	import { Button, Modal } from '@atoms';

	type Props = {
		open?: boolean;
		onSelect: (status: 'completed' | 'deferred') => void;
	};

	let { open = $bindable(false), onSelect }: Props = $props();

	function select(status: 'completed' | 'deferred') {
		open = false;
		onSelect(status);
	}
</script>

<Modal bind:open title="Есть активный заказ" description="Что с ним сделать?">
	<div class="request-switch-modal__buttons">
		<Button class="request-switch-modal__button" onclick={() => select('completed')}>
			Завершить
		</Button>
		<Button class="request-switch-modal__button" onclick={() => select('deferred')}>
			Отложить
		</Button>
		<Button class="request-switch-modal__button" variant="white" onclick={() => (open = false)}>
			Не переключать
		</Button>
	</div>
</Modal>

<style lang="scss">
	@use './request-switch-modal.scss';
</style>
