const REGISTRATION_DATA = {
	email: 'user@example.com',
	password: 'password123',
	confirmPassword: 'password123'
};

export const REGISTRATION = {
	data: REGISTRATION_DATA,
	dataWithUnnormalizedEmail: { ...REGISTRATION_DATA, email: '  User@Example.com  ' },
	dataWithEmptyEmail: { ...REGISTRATION_DATA, email: '' },
	mismatchedPassword: 'another-password',
	existingUser: { id: 1 },
	registeredUser: { success: true as const, userId: 1, email: REGISTRATION_DATA.email },
	emailConflict: {
		success: false as const,
		reason: 'email-conflict' as const,
		errors: { formErrors: [], fieldErrors: { email: ['Почта уже используется'] } }
	},
	invalidRegistration: {
		success: false as const,
		reason: 'invalid' as const,
		errors: { formErrors: [], fieldErrors: { email: ['Введите почту'] } }
	},
	serializedEmailConflict: JSON.stringify([
		{ status: 1, errors: 2 },
		'invalid',
		{ formErrors: 3, fieldErrors: 4 },
		[],
		{ email: 5 },
		[6],
		'Почта уже используется'
	]),
	testPasswordHash: 'test-password-hash',
	url: 'http://localhost/register',
	databaseErrorMessage: 'database error',
	emailErrorMessage: 'email error'
};
