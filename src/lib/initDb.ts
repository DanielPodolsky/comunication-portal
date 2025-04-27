
import { initializeDatabase } from './mysql.js';

// Function to initialize the database
export const setupDatabase = async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};
