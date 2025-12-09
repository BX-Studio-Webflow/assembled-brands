import { encrypt } from '../lib/encryption.ts';
import { logger } from '../lib/logger.ts';
import type { UserRepository } from '../repository/user.ts';
import { NewUser, type User } from '../schema/schema.ts';

/**
 * Service class for managing users, including creation, authentication, and profile management
 */
export class UserService {
	private repo: UserRepository;

	/**
	 * Creates an instance of UserService
	 * @param {UserRepository} userRepository - Repository for user operations
	 */
	constructor(userRepository: UserRepository) {
		this.repo = userRepository;
		this.create = this.create.bind(this);
		this.findByEmail = this.findByEmail.bind(this);
	}

	/**
	 * Creates a new user
	 * @param {NewUser} user - User's data
	 * @returns {Promise<User>} Created user
	 * @throws {Error} When user creation fails
	 */
	public async create(user: NewUser) {
		try {
			const hashedPassword = encrypt(user.password);

			// Create user with all fields
			const createdUser = await this.repo.create({
				...user,
				password: hashedPassword,
				auth_provider: 'local',
			});

			return createdUser;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Finds a user by their email address
	 * @param {string} email - Email address to search for
	 * @returns {Promise<User|undefined>} The user if found
	 */
	public async findByEmail(email: string) {
		return this.repo.findByEmail(email);
	}

	/**
	 * Finds a user by their ID
	 * @param {number} id - ID of the user
	 * @returns {Promise<User|undefined>} The user if found
	 */
	public async find(id: number) {
		return this.repo.find(id);
	}

	/**
	 * Updates a user's information
	 * @param {number} id - ID of the user to update
	 * @param {Partial<User>} user - Updated user information
	 * @returns {Promise<User>} The updated user
	 */
	public async update(id: number, user: Partial<User>) {
		return this.repo.update(id, user);
	}

	/**
	 * Updates a user's profile image
	 * @param {number} id - ID of the user to update
	 * @param {string} imageUrl - URL of the new profile image
	 * @returns {Promise<User>} The updated user
	 */
	public async updateProfileImage(id: number, imageUrl: string) {
		return this.repo.update(id, {
			profile_picture: imageUrl,
		});
	}

	/**
	 * Deletes a user
	 * @param {number} id - ID of the user to delete
	 * @returns {Promise<void>}
	 */
	public async delete(id: number) {
		return this.repo.delete(id);
	}

	// Email sending for users is handled elsewhere; no Stripe dependency here.
}
