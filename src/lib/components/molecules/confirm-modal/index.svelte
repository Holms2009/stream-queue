<script lang="ts">
	import { Button, Modal } from '@atoms';

	type Props = {
		open?: boolean;
		title?: string;
		onConfirm: () => void;
		onClose?: () => void;
	};

	let { open = $bindable(false), title = 'Вы уверены?', onConfirm, onClose }: Props = $props();

	function close() {
		open = false;
		onClose?.();
	}

	function confirm() {
		onConfirm();
		close();
	}
</script>

<Modal
	bind:open
	{title}
	onOpenChange={(isOpen) => {
		if (!isOpen) onClose?.();
	}}
>
	<div class="confirm-modal__buttons">
		<Button class="confirm-modal__button" onclick={confirm}>Ок</Button>
		<Button class="confirm-modal__button" variant="white" onclick={close}>Отмена</Button>
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
