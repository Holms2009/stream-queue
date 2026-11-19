import { hashPassword } from './password';
import { addUser, addUserData, getUserByID, updateUser } from '@db/actions/user';
import type { TUser } from '@db/types';

export async function createUser(email: string, password: string): Promise<TUser> {
	const passwordHash = await hashPassword(password);

	const user = await addUser(email, passwordHash);

	if (!user) throw new Error('Unexpected error while adding user');

	const userData = await addUserData(user.id);

	if (!userData) throw new Error('Unexpected error while adding user data');

	return user;
}

export async function updateUserPassword(userId: number, password: string): Promise<void> {
	const passwordHash = await hashPassword(password);

	await updateUser(userId, { passwordHash });
}

export async function getUserPasswordHash(userId: number): Promise<string> {
	const user = await getUserByID(userId);

	if (!user) {
		throw new Error('Cannot get password hash. User not found.');
	}

	return user.passwordHash;
}
