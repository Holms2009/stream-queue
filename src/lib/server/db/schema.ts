import {
	boolean,
	pgTable,
	serial,
	integer,
	text,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

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
