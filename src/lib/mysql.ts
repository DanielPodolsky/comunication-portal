import mysql from 'mysql2/promise';

// This file is designed for Node.js environments
// In browser environments, it will use simulation/mock functions

const isBrowser = typeof window !== 'undefined';

let pool: any = null;

// Create a mock pool for browser environments
const mockPool = {
  execute: async (query: string, params: any[] = []) => {
    console.log('Mock MySQL query:', query, params);
    return [[], {}]; // Return empty results
  },
  getConnection: async () => {
    return {
      release: () => {}
    };
  }
};

try {
  if (!isBrowser) {
    // Only try to import mysql2 in Node.js environment
    const mysql = require('mysql2/promise');
    
    // MySQL connection pool - will only work in Node.js
    pool = mysql.createPool({
      host: 'localhost',
      user: 'appuser',
      password: 'yourpassword',
      database: 'communication_ltd',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } else {
    pool = mockPool;
    console.log('Running in browser environment - using mock MySQL');
  }
} catch (error) {
  console.error('MySQL import failed, using mock implementation:', error);
  pool = mockPool;
}

// Export the pool
export { pool };

// Test connection function
export const testConnection = async (): Promise<boolean> => {
  if (isBrowser) {
    console.log('Browser environment detected, using localStorage for data storage');
    return true;
  }
  
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('Failed to connect to MySQL:', error);
    return false;
  }
};

// Initialize database tables (will be mocked in browser)
export const initializeDatabase = async (): Promise<void> => {
  if (isBrowser) {
    console.log('Browser environment - initializing localStorage database simulation');
    
    // Initialize default packages if not exist
    const packagesStr = localStorage.getItem('packages');
    if (!packagesStr) {
      const defaultPackages = [
        {
          id: '1',
          name: 'Basic',
          description: 'Basic internet package for small households',
          price: 29.99,
          speed: 100,
          features: ['100 Mbps', 'Unlimited data', 'Basic support']
        },
        {
          id: '2',
          name: 'Standard',
          description: 'Standard internet package for medium households',
          price: 49.99,
          speed: 300,
          features: ['300 Mbps', 'Unlimited data', 'Priority support', 'Free installation']
        },
        {
          id: '3',
          name: 'Premium',
          description: 'Premium internet package for large households',
          price: 79.99,
          speed: 1000,
          features: ['1 Gbps', 'Unlimited data', '24/7 Premium support', 'Free installation', 'Smart Wi-Fi']
        }
      ];
      
      localStorage.setItem('packages', JSON.stringify(defaultPackages));
    }
    
    // Make sure we have a users array
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    
    // Make sure we have a customers array
    if (!localStorage.getItem('customers')) {
      localStorage.setItem('customers', JSON.stringify([]));
    }
    
    return;
  }
  
  try {
    // Real MySQL implementation for Node.js environment
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        passwordHistory JSON NOT NULL,
        lastResetToken VARCHAR(255),
        lastResetTokenExpiry BIGINT,
        failedLoginAttempts INT NOT NULL DEFAULT 0,
        locked BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    // Create customers table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        packageId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Create packages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS packages (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        speed INT NOT NULL,
        features JSON NOT NULL
      )
    `);
    
    // Check if packages table is empty, if yes insert default packages
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM packages');
    const count = (rows as any)[0].count;
    
    if (count === 0) {
      // Insert default packages
      await pool.execute(`
        INSERT INTO packages (id, name, description, price, speed, features) VALUES 
        ('1', 'Basic', 'Basic internet package for small households', 29.99, 100, '["100 Mbps", "Unlimited data", "Basic support"]'),
        ('2', 'Standard', 'Standard internet package for medium households', 49.99, 300, '["300 Mbps", "Unlimited data", "Priority support", "Free installation"]'),
        ('3', 'Premium', 'Premium internet package for large households', 79.99, 1000, '["1 Gbps", "Unlimited data", "24/7 Premium support", "Free installation", "Smart Wi-Fi"]')
      `);
    }

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  }
};
