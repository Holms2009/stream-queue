import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const user = locals.user;

	return {
		user: user ? { id: user.id, displayName: user.displayName, avatar: user.avatar } : null
	};
};
