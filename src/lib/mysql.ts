
import mysql from 'mysql2/promise';

// MySQL connection pool
export const pool = mysql.createPool({
  host: 'localhost',
  user: 'appuser',
  password: 'yourpassword', // Use your actual password
  database: 'communication_ltd',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection function
export const testConnection = async (): Promise<boolean> => {
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

// Initialize database tables
export const initializeDatabase = async (): Promise<void> => {
  try {
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
