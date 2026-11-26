import type { z } from 'zod';

import type { activateRequestSchema, moveRequestSchema, requestStatusSchema } from './validation';

type ActivateRequestData = z.output<typeof activateRequestSchema>;
type MoveRequestData = z.output<typeof moveRequestSchema>;
type ChangeRequestStatusData = {
	queueId: number;
	requestId: number;
	status: z.output<typeof requestStatusSchema>;
	position: number | null;
};

export async function activateRequest(data: ActivateRequestData): Promise<void> {
	const response = await fetch('/api/requests/activate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) throw await response.json();
}

export async function changeRequestStatus(data: ChangeRequestStatusData): Promise<void> {
	const response = await fetch('/api/requests/change-status', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) throw await response.json();
}

export async function moveRequest(data: MoveRequestData): Promise<void> {
	const response = await fetch('/api/requests/move', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	if (!response.ok) throw await response.json();
}
