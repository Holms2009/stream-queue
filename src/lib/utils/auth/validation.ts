import { z } from 'zod';

const emailSchema = z
	.string({ error: 'Введите почту' })
	.trim()
	.min(1, 'Введите почту')
	.toLowerCase()
	.max(255, 'Почта должна содержать не более 255 символов')
	.pipe(z.email({ error: 'Введите корректный адрес почты' }));

const passwordSchema = z
	.string({ error: 'Введите пароль' })
	.min(1, 'Введите пароль')
	.min(8, 'Пароль должен содержать не менее 8 символов')
	.max(255, 'Пароль должен содержать не более 255 символов');

export const passwordResetRequestSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
	.object({
		password: passwordSchema,
		confirmPassword: z.string({ error: 'Подтвердите пароль' }).min(1, 'Подтвердите пароль')
	})
	.refine(({ password, confirmPassword }) => password === confirmPassword, {
		path: ['confirmPassword'],
		error: 'Пароли не совпадают'
	});

export const registrationSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string({ error: 'Подтвердите пароль' }).min(1, 'Подтвердите пароль')
	})
	.refine(({ password, confirmPassword }) => password === confirmPassword, {
		path: ['confirmPassword'],
		error: 'Пароли не совпадают'
	});

export type RegistrationData = z.output<typeof registrationSchema>;

export const loginSchema = z.object({
	email: emailSchema,
	password: z
		.string({ error: 'Введите пароль' })
		.min(1, 'Введите пароль')
		.max(255, 'Пароль должен содержать не более 255 символов')
});

export type LoginData = z.output<typeof loginSchema>;
