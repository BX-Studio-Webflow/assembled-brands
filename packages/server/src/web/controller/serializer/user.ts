import type { User } from '../../../schema/schema.js';

type UserResponse = {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	createdAt: Date | null;
	is_verified: boolean | null;
	role: string | null;
	phone: string | null;
	profile_picture: string | null;
	bio: string | null;
	subscription_status: string | null;
	auth_provider: 'local';
};

export async function serializeUser(user: User): Promise<UserResponse> {
	return {
		id: user.id,
		email: user.email,
		first_name: user.first_name,
		last_name: user.last_name,
		createdAt: user.createdAt,
		is_verified: user.is_verified,
		role: user.role,
		phone: user.phone,
		profile_picture: user.profile_picture,
		bio: user.bio,
		subscription_status: user.subscription_status,
		auth_provider: user.auth_provider ?? 'local',
	};
}
