export const EMAIL_VERIFICATION = {
	token: 'verification-token',
	tokenHash: '46f6e828be35b9e2482ea7fc7a6a8f43f95a131098470486be3d137d408c8811',
	passwordHash: 'test-password-hash',
	account: {
		id: 1,
		email: 'user@example.com',
		emailVerified: false,
		passwordHash: 'test-password-hash',
		lastEmailVerifyRequestAt: null,
		createdAt: new Date('2025-01-01T00:00:00.000Z'),
		updatedAt: new Date('2025-01-01T00:00:00.000Z')
	},
	tokenRecord: {
		id: '00000000-0000-4000-8000-000000000001',
		userId: 1,
		tokenHash: 'test-token-hash',
		expiresAt: new Date('2030-01-01T00:00:00.000Z'),
		createdAt: new Date('2025-01-01T00:00:00.000Z')
	},
	origin: 'http://localhost',
	pageUrl: 'http://localhost/confirm-email?token=verification-token',
	errorMessage: 'confirmation error',
	formSuccess: { status: 'success' as const },
	formInvalid: { status: 'invalid-token' as const },
	formExpired: { status: 'expired-token' as const },
	formError: { status: 'error' as const }
};
