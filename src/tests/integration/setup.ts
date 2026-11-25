import { createServer } from 'vite';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		integrationOrigin: string;
	}
}

export async function setup(project: TestProject) {
	const emails: { email: string }[] = [];
	function recordEmail(data: { email: string }) {
		emails.push(data);
	}
	process.on('stream-queue-test-reset-email', recordEmail);
	const server = await createServer({
		server: { host: '127.0.0.1', port: 0 },
		logLevel: 'error',
		plugins: [
			{
				name: 'mock-password-reset-email',
				enforce: 'pre',
				transform(_code, id) {
					if (id.replaceAll('\\', '/').endsWith('/src/lib/server/email/actions/auth.ts')) {
						return "export async function sendResetPasswordLink(data) { process.emit('stream-queue-test-reset-email', data); } export async function sendEmailVerifyLink() {}";
					}
				},
				configureServer(vite) {
					vite.middlewares.use('/__test/emails', (_request, response) => {
						response.setHeader('content-type', 'application/json');
						response.end(JSON.stringify(emails));
					});
				}
			}
		]
	});
	await server.listen();
	const address = server.httpServer?.address();
	if (!address || typeof address === 'string') throw new Error('Не удалось запустить сервер');
	project.provide('integrationOrigin', `http://127.0.0.1:${address.port}`);

	return async () => {
		process.off('stream-queue-test-reset-email', recordEmail);
		await server.close();
	};
}
