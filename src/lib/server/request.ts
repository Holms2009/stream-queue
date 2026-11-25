import { z } from 'zod';

import {
	getActiveRequest,
	getLastRequestPosition,
	getRequest,
	insertRequest,
	updateRequest,
	withRequestTransaction
} from '@db/actions/request';
import { getQueue } from '@db/actions/queue';
import type { requestsTable } from '@db/schema';
import type { CreateRequestData } from '../utils/request/validation';
import type { AppErrors } from '../utils/errors';
import { createRequestSchema, requestPositionSchema } from '../utils/request/validation';

export type RequestStatus = typeof requestsTable.$inferSelect.status;

export async function createRequest({
	userId,
	queueId,
	input
}: {
	userId: number;
	queueId: number;
	input: unknown;
}) {
	const result = createRequestSchema.safeParse(input);

	if (!result.success) {
		const errors: AppErrors = z.flattenError(result.error);

		return { success: false as const, reason: 'invalid' as const, errors };
	}

	const added = await addRequest(userId, queueId, result.data);

	if (!added) return { success: false as const, reason: 'queue-not-found' as const };

	return { success: true as const };
}

export async function activateRequest({
	userId,
	queueId,
	requestId,
	previousStatus = 'completed'
}: {
	userId: number;
	queueId: number;
	requestId: number;
	previousStatus?: 'completed' | 'deferred';
}) {
	const activated = await activateRequestInQueue(userId, queueId, requestId, previousStatus);
	return { success: activated };
}

export async function changeRequestStatus({
	userId,
	queueId,
	requestId,
	status,
	position
}: {
	userId: number;
	queueId: number;
	requestId: number;
	status: RequestStatus;
	position?: unknown;
}) {
	const parsedPosition = requestPositionSchema.safeParse(position);
	if (!parsedPosition.success) {
		return { success: false as const };
	}
	return {
		success: await changeStatusInQueue(userId, queueId, requestId, status, parsedPosition.data ?? null)
	};
}

async function addRequest(userId: number, queueId: number, data: CreateRequestData) {
	return await withRequestTransaction(async (transaction) => {
		const queue = await getQueue(userId, queueId, transaction, true);

		if (!queue) return false;

		const position = ((await getLastRequestPosition(queue.id, 'waiting', transaction)) ?? 0) + 1;

		await insertRequest(
			{
				queueId: queue.id,
				title: data.title,
				viewerName: data.viewerName,
				status: 'waiting',
				position
			},
			transaction
		);

		return true;
	});
}

async function changeStatusInQueue(
	userId: number,
	queueId: number,
	requestId: number,
	status: RequestStatus,
	position: number | null
) {
	return await withRequestTransaction(async (transaction) => {
		const queue = await getQueue(userId, queueId, transaction, true);

		if (!queue) return false;

		const selected = await getRequest(requestId, queue.id, transaction);

		if (!selected) return false;

		await updateRequest(selected.id, { status, position }, transaction);

		return true;
	});
}

async function activateRequestInQueue(
	userId: number,
	queueId: number,
	requestId: number,
	previousStatus: 'completed' | 'deferred'
) {
	return await withRequestTransaction(async (transaction) => {
		const queue = await getQueue(userId, queueId, transaction, true);

		if (!queue) return false;

		const selected = await getRequest(requestId, queue.id, transaction);

		if (!selected) return false;

		const active = await getActiveRequest(queue.id, transaction);

		if (active) {
			const position = previousStatus === 'deferred'
				? ((await getLastRequestPosition(queue.id, 'deferred', transaction)) ?? 0) + 1
				: null;
			await updateRequest(active.id, { status: previousStatus, position }, transaction);
		}

		await updateRequest(selected.id, { status: 'active', position: null }, transaction);

		return true;
	});
}
