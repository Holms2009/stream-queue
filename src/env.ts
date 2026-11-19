import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PORT: {},
	NODE_ENV: {},
	DATABASE_URL: { description: 'The database connection string.' },
	RESEND_API_KEY: {},
	EMAIL_FROM: {}
});
