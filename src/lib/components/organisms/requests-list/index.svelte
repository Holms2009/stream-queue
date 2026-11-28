<script lang="ts">
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
	import { flip } from 'svelte/animate';
	import type { ComponentProps } from 'svelte';
	import { RequestsListItem } from '@molecules';
	import { moveRequest, type DragRequest, type QueueGroup } from '../../../utils/request';

	type Props = {
		requests: DragRequest[];
		items: DragRequest[];
		disabled: boolean;
		dragDisabled: boolean;
		onPreviewChange: (items: DragRequest[] | null) => void;
		onMove: (requestId: number, position: number) => void;
		onActivate: (requestId: number) => void;
		onRemove: (requestId: number) => void;
		onMoveToEnd: (requestId: number) => void;
		onChangeStatus: (requestId: number, status: QueueGroup) => void;
	};

	let {
		requests,
		items,
		disabled,
		dragDisabled,
		onPreviewChange,
		onMove,
		onActivate,
		onRemove,
		onMoveToEnd,
		onChangeStatus
	}: Props = $props();

	const handleDragOver: NonNullable<ComponentProps<typeof DragDropProvider>['onDragOver']> = (
		event
	) => {
		const { source, target } = event.operation;
		const dragged = items.find((item) => item.id === source?.id);
		const hovered = items.find((item) => item.id === target?.id);

		if (!dragged || !hovered || dragged.status !== hovered.status || dragged.id === hovered.id) {
			return;
		}

		const position =
			items
				.filter((item) => item.status === dragged.status)
				.findIndex((item) => item.id === hovered.id) + 1;

		onPreviewChange(moveRequest(items, dragged.id, position));
	};

	const handleDragEnd: NonNullable<ComponentProps<typeof DragDropProvider>['onDragEnd']> = (
		event
	) => {
		const dragged = requests.find((item) => item.id === event.operation.source?.id);
		if (!event.canceled && dragged) {
			const position =
				items
					.filter((item) => item.status === dragged.status)
					.findIndex((item) => item.id === dragged.id) + 1;
			const previousPosition =
				requests
					.filter((item) => item.status === dragged.status)
					.findIndex((item) => item.id === dragged.id) + 1;

			if (position && position !== previousPosition) onMove(dragged.id, position);
		}

		onPreviewChange(null);
	};
</script>

<DragDropProvider
	modifiers={[RestrictToVerticalAxis]}
	onDragOver={handleDragOver}
	onDragEnd={handleDragEnd}
>
	<div class="requests-list" aria-label="Очередь заказов">
		{#each items as request, index (request.id)}
			<div animate:flip={{ duration: 300 }}>
				<RequestsListItem
					data={{ ...request, author: request.viewerName }}
					index={request.status === 'waiting' ? index + 1 : null}
					{disabled}
					{dragDisabled}
					onActivate={() => onActivate(request.id)}
					onRemove={() => onRemove(request.id)}
					onMoveToEnd={() => onMoveToEnd(request.id)}
					onChangeStatus={(status) => onChangeStatus(request.id, status)}
				/>
			</div>
		{/each}
	</div>
	<DragOverlay dropAnimation={null}>
		{#snippet children(source)}
			{@const dragged = items.find((item) => item.id === source.id)}

			{#if dragged}
				<div class="requests-list__drag-overlay">
					<RequestsListItem
						data={{ ...dragged, author: dragged.viewerName }}
						preview={true}
						index={items
							.filter((item) => item.status === dragged.status)
							.findIndex((item) => item.id === dragged.id) + 1}
						disabled={true}
						onMoveToEnd={() => {}}
						onChangeStatus={() => {}}
					/>
				</div>
			{/if}
		{/snippet}
	</DragOverlay>
</DragDropProvider>

<style lang="scss">
	@use './requests-list.scss';
</style>
