// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { TSession } from '@db/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: TSession | null;
			user: {
				id: number;
				email: string;
				emailVerified: boolean;
				displayName: string | null;
				avatar: string | null;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
