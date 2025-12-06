import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Get the database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

// Create a database connection
export const createConnection = () => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(databaseUrl);
  // Include schema and relations for proper type inference
  return drizzle(sql, { schema });
};

// Export a singleton instance for use throughout the application
// Use lazy initialization to avoid errors during build time
let _db: ReturnType<typeof createConnection> | null = null;
export const db = new Proxy({} as ReturnType<typeof createConnection>, {
  get(target, prop) {
    if (!_db) {
      _db = createConnection();
    }
    return _db[prop as keyof ReturnType<typeof createConnection>];
  },
});

// Export schema for use in other files
export { schema };
