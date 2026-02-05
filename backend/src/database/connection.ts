import knex from 'knex';

export const db = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL || {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'ai_ide',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
});

export const initDatabase = async () => {
  try {
    await db.raw('SELECT 1');
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};