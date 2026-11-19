import type { CSSProperties } from 'react';
import { Link, Text } from '@react-email/components';

import BasicLayout from '../layouts/BasicLayout';
import MainButton from '../components/MainButton';

export default function EmailConfirm({ link }: { link: string }) {
	return (
		<BasicLayout>
			<Text style={titleStyles}>Подтверждение почты</Text>
			<Text style={textStyles}>
				Спасибо за регистрацию в <b>Stream Queue</b>!
			</Text>
			<Text style={textStyles}>
				Чтобы завершить регистрацию, подтвердите вашу почту по кнопке ниже. Ссылка действительна в
				течение 1 часа.
			</Text>
			<Text style={textStyles}>
				Если вы не регистрировались в Stream Queue — просто проигнорируйте это письмо.
			</Text>
			<MainButton href={link} style={{ marginTop: '10px' }}>
				Подтвердить почту
			</MainButton>
			<Text style={subTextStyles}>Если кнопка не работает, перейдите по ссылке:</Text>
			<Link style={linkStyles} href={link} target="_blank" rel="noopener noreferrer">
				{link}
			</Link>
		</BasicLayout>
	);
}

const titleStyles: CSSProperties = {
	marginTop: '0',
	marginBottom: '20px',

	fontSize: '20px',
	lineHeight: '28px',
	fontWeight: '600',
	color: '#242424'
};

const textStyles: CSSProperties = {
	marginTop: '0',
	marginBottom: '14px',

	fontSize: '14px',
	lineHeight: '22px',
	color: '#242424'
};

const subTextStyles: CSSProperties = {
	marginTop: '12px',
	marginBottom: '0',
	display: 'block',

	fontSize: '12px',
	lineHeight: '16px',
	color: '#9ca3af'
};

const linkStyles: CSSProperties = {
	marginTop: '4px',
	marginBottom: '0',
	display: 'inline-block',

	fontSize: '12px',
	lineHeight: '16px',
	color: '#12aabb',
	wordBreak: 'break-all'
};
