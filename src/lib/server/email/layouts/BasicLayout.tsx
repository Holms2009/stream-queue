import React from 'react';
import { Html, Body, Container, Row, Text, Column } from '@react-email/components';

export default function BasicLayout({ children }: React.PropsWithChildren) {
	return (
		<Html>
			<Body style={bodyStyles}>
				<Container style={containerStyles}>
					<Row style={headerStyles}>
						<Column style={{ verticalAlign: 'middle' }}>
							<Text style={titleStyles}>Stream Queue</Text>
						</Column>
					</Row>
					<Row style={contentStyles}>
						<Column>{children}</Column>
					</Row>
				</Container>
			</Body>
		</Html>
	);
}

const bodyStyles = {
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
	color: '#242424',

	backgroundColor: '#e4e4e4'
};

const headerStyles = {
	paddingBottom: '8px',

	borderBottom: '1px solid #afafaf'
};

const titleStyles = {
	margin: '0',

	fontSize: '32px',
	lineHeight: '32px',
	fontWeight: '700',
	color: '#242424'
};

const containerStyles = {
	margin: '0 auto',
	padding: '16px',
	maxWidth: '480px',

	backgroundColor: '#F2F2F2',
	borderRadius: '8px'
};

const contentStyles = {
	paddingTop: '16px'
};
