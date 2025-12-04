
import { env } from 'process';
import { logger } from '../lib/logger.ts';
import type { UserRepository } from '../repository/user.ts';
import type { User } from '../schema/schema.ts';
import { encrypt } from '../lib/encryption.ts';

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
   * @param {string} name - User's name
   * @param {string} email - User's email address
   * @param {string} password - User's password (will be encrypted)
   * @param {'master'|'owner'|'host'} role - User's role
   * @param {string} phone - User's phone number
   * @param {Partial<User>} [additionalFields={}] - Optional additional user fields
   * @returns {Promise<User>} Created user
   * @throws {Error} When user creation fails
   */
  public async create(
    name: string,
    email: string,
    password: string,
    role: 'master' | 'owner' | 'host',
    phone: string,
    additionalFields: Partial<User> = {},
  ) {
    try {
      const hashedPassword = encrypt(password);

      // Create user with all fields
      const user = await this.repo.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        auth_provider: 'local',
        ...additionalFields,
      });

      return user;
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
