import React from 'react';
import { Button } from '@react-email/components';

export default function MainButton({
	href = '#',
	style = {},
	children
}: React.PropsWithChildren<{ href: string; style?: React.CSSProperties }>) {
	return (
		<Button
			href={href}
			style={{ ...buttonStyles, ...style }}
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</Button>
	);
}

const buttonStyles = {
	padding: '8px 16px',

	fontSize: '16px',
	lineHeight: '21px',
	fontWeight: '700',
	color: '#F2F2F2',

	backgroundColor: '#12aabb',
	border: 'none',
	borderRadius: '6px',

	cursor: 'pointer'
};
