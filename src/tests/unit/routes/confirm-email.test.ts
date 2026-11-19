import { beforeEach, describe, expect, it, vi } from 'vitest';

import { confirmEmail } from '@server/auth/email-verification';
import { actions } from '../../../routes/confirm-email/+page.server';
import { EMAIL_VERIFICATION } from '../../mock/email-verification';

vi.mock('@server/auth/email-verification', () => ({ confirmEmail: vi.fn() }));

function createEvent(token?: string) {
	const formData = new FormData();
	if (token !== undefined) formData.set('token', token);

	return {
		request: new Request(EMAIL_VERIFICATION.pageUrl, { method: 'POST', body: formData })
	} as unknown as Parameters<typeof actions.default>[0];
}

describe('action подтверждения почты', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('подтверждает почту с переданным токеном', async () => {
		vi.mocked(confirmEmail).mockResolvedValue(EMAIL_VERIFICATION.formSuccess);

		const result = await actions.default(createEvent(EMAIL_VERIFICATION.token));

		expect(confirmEmail).toHaveBeenCalledExactlyOnceWith(EMAIL_VERIFICATION.token);
		expect(result).toEqual({ status: 'success' });
	});

	it('отклоняет запрос без токена до вызова серверной функции', async () => {
		const result = await actions.default(createEvent());

		expect(result).toMatchObject({ status: 400, data: { status: 'invalid-token' } });
		expect(confirmEmail).not.toHaveBeenCalled();
	});

	it('возвращает ошибку для недействительного токена', async () => {
		vi.mocked(confirmEmail).mockResolvedValue(EMAIL_VERIFICATION.formInvalid);

		const result = await actions.default(createEvent(EMAIL_VERIFICATION.token));

		expect(result).toMatchObject({ status: 400, data: { status: 'invalid-token' } });
	});

	it('возвращает ошибку для просроченного токена', async () => {
		vi.mocked(confirmEmail).mockResolvedValue(EMAIL_VERIFICATION.formExpired);

		const result = await actions.default(createEvent(EMAIL_VERIFICATION.token));

		expect(result).toMatchObject({ status: 410, data: { status: 'expired-token' } });
	});

	it('возвращает общую ошибку при сбое подтверждения', async () => {
		vi.mocked(confirmEmail).mockRejectedValue(new Error(EMAIL_VERIFICATION.errorMessage));
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});

		try {
			const result = await actions.default(createEvent(EMAIL_VERIFICATION.token));

			expect(result).toMatchObject({ status: 500, data: { status: 'error' } });
		} finally {
			log.mockRestore();
		}
	});
});
