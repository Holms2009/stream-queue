import { sendEmail } from '../index';
import EmailConfirm from '../templates/EmailConfirm';
import PasswordRestore from '../templates/PasswordRestore';

export async function sendEmailVerifyLink({
	email,
	token,
	origin
}: {
	email: string;
	token: string;
	origin: string;
}) {
	const link = new URL('/confirm-email', origin);

	link.searchParams.set('token', token);

	await sendEmail({
		to: email,
		subject: 'Подтверждение почты',
		react: EmailConfirm({ link: link.toString() })
	});
}

export async function sendResetPasswordLink({
	email,
	token,
	origin
}: {
	email: string;
	token: string;
	origin: string;
}) {
	const link = new URL('/reset-password', origin);
	link.searchParams.set('token', token);

	await sendEmail({
		to: email,
		subject: 'Сброс пароля',
		react: PasswordRestore({ accountName: email, link: link.toString() })
	});
}
