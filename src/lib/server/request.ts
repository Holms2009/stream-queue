import { z } from 'zod';

import { addRequest } from '@db/actions/request';
import type { AppErrors } from '../utils/errors';
import { createRequestSchema } from '../utils/request/validation';

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

	if (!Number.isSafeInteger(queueId) || queueId <= 0) {
		return { success: false as const, reason: 'queue-not-found' as const };
	}

	const added = await addRequest(userId, queueId, result.data);

	if (!added) return { success: false as const, reason: 'queue-not-found' as const };

	return { success: true as const };
}
