import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables from .env file
dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Tutorials
 * https://www.youtube.com/watch?v=dHTGEQnogPw&ab_channel=WebDevCody
 * https://sat0shi.dev/posts/drizzle-migration/
 * https://sat0shi.dev/posts/drizzle-intro/
 */
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/schema/schema.ts',
  out: './src/schema/migrations',
  dbCredentials: {
    accountId: isDevelopment ? process.env.DEV_DB_ACCOUNT_ID! : process.env.PROD_DB_ACCOUNT_ID!,
    databaseId: isDevelopment ? process.env.DEV_DB_DATABASE_ID! : process.env.PROD_DB_DATABASE_ID!,
    token: isDevelopment ? process.env.DEV_DB_TOKEN! : process.env.PROD_DB_TOKEN!,
  },
  verbose: true,
  strict: true,
});
