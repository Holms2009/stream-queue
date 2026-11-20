const LOGIN_DATA = { email: 'user@example.com', password: 'password123' };

export const LOGIN = {
	data: LOGIN_DATA,
	unnormalizedData: { ...LOGIN_DATA, email: '  User@Example.com  ' },
	shortPasswordData: { ...LOGIN_DATA, password: 'abc' },
	invalidInputs: [
		{ data: { ...LOGIN_DATA, email: '' }, field: 'email', message: 'Введите почту' },
		{
			data: { ...LOGIN_DATA, email: 'invalid' },
			field: 'email',
			message: 'Введите корректный адрес почты'
		},
		{ data: { ...LOGIN_DATA, password: '' }, field: 'password', message: 'Введите пароль' },
		{
			data: { ...LOGIN_DATA, password: 'a'.repeat(256) },
			field: 'password',
			message: 'Пароль должен содержать не более 255 символов'
		}
	],
	user: { id: 1, email: LOGIN_DATA.email, emailVerified: false, passwordHash: 'password-hash' },
	wrongPassword: 'wrong-password',
	token: 'session-token',
	session: { id: 'session-id', userId: 1, expiresAt: new Date('2027-01-01T00:00:00.000Z') },
	url: 'http://localhost/login',
	error: 'unexpected error',
	invalid: {
		success: false as const,
		reason: 'invalid' as const,
		errors: { formErrors: [], fieldErrors: { email: ['Введите почту'] } }
	},
	invalidCredentials: {
		success: false as const,
		reason: 'invalid-credentials' as const,
		errors: { formErrors: ['Неверная почта или пароль'], fieldErrors: {} }
	}
};
