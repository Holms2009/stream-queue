import type { sessionsTable, usersDataTable, usersTable } from './schema';
import type { db } from './index';

export type TDatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TUser = typeof usersTable.$inferSelect;
export type TUserData = typeof usersDataTable.$inferSelect &
	Pick<typeof usersTable.$inferSelect, 'email' | 'emailVerified'>;
export type TSession = typeof sessionsTable.$inferSelect;
