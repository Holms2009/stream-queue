<script lang="ts">
	import { createDraggable, createDroppable } from '@dnd-kit/svelte';
	import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom';
	import { RequestsListItem } from '@molecules';
	import type { DragRequest, QueueGroup } from '../../../utils/request';

	type Props = {
		request: DragRequest;
		displayIndex: number;
		disabled: boolean;
		dragDisabled: boolean;
		onActivate: () => void;
		onRemove: () => void;
		onMoveToEnd: () => void;
		onChangeStatus: (status: QueueGroup) => void;
	};
	let {
		request,
		displayIndex,
		disabled,
		dragDisabled,
		onActivate,
		onRemove,
		onMoveToEnd,
		onChangeStatus
	}: Props = $props();
	const draggable = createDraggable({
		get id() {
			return request.id;
		},
		get disabled() {
			return dragDisabled;
		},
		sensors: [
			PointerSensor.configure({
				activationConstraints: [
					new PointerActivationConstraints.Delay({ value: 150, tolerance: 10 })
				]
			}),
			KeyboardSensor
		]
	});
	const droppable = createDroppable({
		get id() {
			return request.id;
		}
	});
</script>

<div
	{@attach draggable.attach}
	{@attach droppable.attach}
	aria-label={request.title}
	class:drag-source={draggable.isDragSource}
>
	<div class="request-content">
		<RequestsListItem
			data={{ ...request, author: request.viewerName }}
			index={displayIndex}
			{disabled}
			{onActivate}
			{onRemove}
			{onMoveToEnd}
			{onChangeStatus}
		/>
	</div>
</div>

<style>
	.drag-source {
		opacity: 0.3;
	}
	.request-content {
		transition: transform 150ms ease-out;
	}
	.drag-source .request-content {
		transform: scaleX(0.97);
	}
</style>
