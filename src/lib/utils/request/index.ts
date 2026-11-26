export type QueueGroup = 'waiting' | 'deferred';

type PositionedRequest = { position: number | null };
type QueueRequest = PositionedRequest & { id: number; status: string };

export function sortQueueRequests<T extends QueueRequest>(requests: T[]): T[] {
	return requests
		.filter((request) => request.status === 'waiting' || request.status === 'deferred')
		.toSorted((a, b) => {
			if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
			if (a.position === null && b.position !== null) return 1;
			if (a.position !== null && b.position === null) return -1;
			return (a.position ?? 0) - (b.position ?? 0) || a.id - b.id;
		});
}

export function getNextRequestPosition(requests: QueueRequest[], type: QueueGroup): number {
	const arr = requests.filter((request) => request.status === type);

	return Math.max(0, ...arr.map((request) => request.position ?? 0)) + 1;
}

export function moveRequest<T extends QueueRequest>(
	requests: T[],
	requestId: number,
	position: number
): T[] {
	const ordered = sortQueueRequests(requests);
	const request = ordered.find((item) => item.id === requestId);

	if (!request) return ordered;

	const group = ordered.filter((item) => item.status === request.status);
	const index = group.findIndex((item) => item.id === requestId);

	group.splice(index, 1);
	group.splice(position - 1, 0, request);

	const moved = group.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 }));

	return request.status === 'waiting'
		? [...moved, ...ordered.filter((item) => item.status === 'deferred')]
		: [...ordered.filter((item) => item.status === 'waiting'), ...moved];
}

export function countQueueRequests(requests: { status: string }[]): Record<QueueGroup, number> {
	const counts = { waiting: 0, deferred: 0 };

	for (const request of requests) {
		if (request.status === 'waiting') {
			counts.waiting++;
		} else if (request.status === 'deferred') {
			counts.deferred++;
		}
	}

	return counts;
}

export type DragRequest = {
	id: number;
	title: string;
	viewerName: string;
	status: string;
	position: number | null;
};
