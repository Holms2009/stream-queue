export const PASSWORD_RESET = {
	userId: 1,
	missingUserId: -1,
	passwordHash: 'test-password-hash',
	testEmailPrefix: 'vitest-reset',
	successMessage: 'Если аккаунт с такой почтой существует, мы отправили письмо для сброса пароля.',
	oneHourMs: 60 * 60 * 1000,
	email: 'user@example.com',
	unnormalizedEmail: '  User@Example.com  ',
	invalidEmails: [
		{ email: '', error: 'Введите почту' },
		{ email: 'invalid', error: 'Введите корректный адрес почты' }
	],
	token: 'reset-token',
	origin: 'http://localhost',
	errorMessage: 'unexpected error',
	formResponses: {
		success: { type: 'success', status: 200, data: '[{"success":1},true]' },
		invalid: {
			type: 'failure',
			status: 400,
			data: '[{"status":1,"errors":2},"invalid",{"formErrors":3,"fieldErrors":4},[],{"email":5},[6,7],"Ошибка почты","Вторая ошибка"]'
		},
		error: {
			type: 'failure',
			status: 500,
			data: '[{"status":1,"errors":2},"error",{"formErrors":3,"fieldErrors":5},[4],"Не удалось отправить запрос. Попробуйте позже.",{}]'
		}
	},
	account: {
		id: 1,
		email: 'user@example.com',
		emailVerified: false,
		passwordHash: 'test-password-hash',
		lastEmailVerifyRequestAt: null,
		createdAt: new Date('2025-01-01T00:00:00.000Z'),
		updatedAt: new Date('2025-01-01T00:00:00.000Z')
	}
};
