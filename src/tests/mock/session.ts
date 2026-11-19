export const SESSION = {
	token: 'session-token',
	id: 'c101e911469c969171040b50d70543313cf968fdef5bacc780776f8fb399ab36',
	now: new Date('2026-01-01T00:00:00.000Z'),
	expiredAt: new Date('2025-12-31T00:00:00.000Z'),
	nearExpiry: new Date('2026-01-02T00:00:00.000Z'),
	renewedExpiry: new Date('2026-01-31T00:00:00.000Z'),
	user: {
		id: 8,
		userId: 15,
		email: 'user@example.com',
		emailVerified: false,
		displayName: 'User',
		avatar: null,
		createdAt: new Date('2025-01-01T00:00:00.000Z')
	},
	publicRoutes: ['/login', '/register', '/register/success', '/confirm-email'],
	protectedRoute: '/',
	databaseError: 'database error'
};
