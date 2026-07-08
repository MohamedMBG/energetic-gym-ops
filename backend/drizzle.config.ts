import { defineConfig } from 'drizzle-kit';

// SQLite. Used only at dev/build time (drizzle-kit generate/push via
// better-sqlite3). The runtime uses the built-in node:sqlite driver instead.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE || 'gym.db',
  },
});
