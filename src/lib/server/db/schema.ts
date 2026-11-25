import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	email: varchar({ length: 255 }).notNull().unique(),
	emailVerified: boolean().default(false).notNull(),
	passwordHash: varchar({ length: 255 }).notNull(),
	lastEmailVerifyRequestAt: timestamp('lastEmailVerifyRequestAt', { withTimezone: true }),
	updatedAt: timestamp('updatedAt', { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
	createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
});

export const usersDataTable = pgTable('users_data', {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	userId: integer()
		.references(() => usersTable.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	avatar: varchar({ length: 255 }),
	displayName: varchar({ length: 255 }),
	createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
});

export const sessionsTable = pgTable('sessions', {
	id: varchar({ length: 255 }).primaryKey(),
	userId: integer()
		.references(() => usersTable.id, { onDelete: 'cascade' })
		.notNull(),
	expiresAt: timestamp().notNull()
});

export const emailVerifyTokensTable = pgTable('email_verify_tokens', {
	id: uuid().defaultRandom().primaryKey(),
	userId: integer()
		.references(() => usersTable.id, { onDelete: 'cascade' })
		.notNull(),
	tokenHash: text().notNull(),
	expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
	id: uuid().defaultRandom().primaryKey(),
	userId: integer()
		.references(() => usersTable.id, { onDelete: 'cascade' })
		.notNull(),
	tokenHash: text().notNull(),
	expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
});

export const queuesTable = pgTable(
	'queues',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		userId: integer()
			.references(() => usersTable.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('queues_user_created_id_idx').on(table.userId, table.createdAt, table.id)]
);

export const requestsTable = pgTable(
	'requests',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		queueId: integer()
			.references(() => queuesTable.id, { onDelete: 'cascade' })
			.notNull(),
		title: text().notNull(),
		viewerName: text().notNull(),
		description: text(),
		status: text()
			.$type<'waiting' | 'active' | 'deferred' | 'completed' | 'canceled' | 'deleted'>()
			.notNull(),
		position: integer(),
		createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('requests_queue_status_position_id_idx').on(
			table.queueId,
			table.status,
			table.position,
			table.id
		)
	]
);
