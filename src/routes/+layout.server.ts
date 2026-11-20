import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const user = locals.user;

	return {
		user: user
			? { id: user.id, email: user.email, displayName: user.displayName, avatar: user.avatar }
			: null
	};
};
