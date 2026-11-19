import type { ReactElement } from 'react';
import { Resend } from 'resend';

import { RESEND_API_KEY, EMAIL_FROM } from '$app/env/private';

export async function sendEmail({
	to,
	subject,
	react
}: {
	to: string;
	subject: string;
	react: ReactElement;
}) {
	if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('RESEND_API_KEY and EMAIL_FROM must be set');

	const resend = new Resend(RESEND_API_KEY);
	const result = await resend.emails.send({ from: EMAIL_FROM, to, subject, react });

	console.log(result);

	if (result.error) throw new Error(`Failed to send email: ${result.error.message}`);

	return result.data;
}
