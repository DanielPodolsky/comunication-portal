
import { initDatabase } from './db';

// Function to initialize the database
export const setupDatabase = async () => {
  try {
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};
