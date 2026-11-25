<script lang="ts">
	import { Button, Modal } from '@atoms';

	type Props = {
		open?: boolean;
		title?: string;
		onConfirm: () => void;
	};

	let { open = $bindable(false), title = 'Вы уверены?', onConfirm }: Props = $props();

	function confirm() {
		open = false;
		onConfirm();
	}
</script>

<Modal bind:open {title}>
	<div class="confirm-modal__buttons">
		<Button class="confirm-modal__button" onclick={confirm}>Ок</Button>
		<Button class="confirm-modal__button" variant="white" onclick={() => (open = false)}>
			Отмена
		</Button>
	</div>
</Modal>

<style lang="scss">
	.confirm-modal__buttons {
		margin-top: 20px;
		display: flex;
		gap: 8px;
	}

	:global {
		.confirm-modal__button {
			width: 100% !important;
		}
	}
</style>
