// mysql.js – ⚠️ SERVER-ONLY — Do NOT import this in frontend code (React/Vite will explode)

import mysql from 'mysql2/promise';

// ✅ MySQL connection pool
export const pool = mysql.createPool({
  host: 'localhost',
  user: 'appuser',           // 🔧 Update as needed
  password: 'yourpassword',  // 🔧 Update as needed
  database: 'communication_ltd',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// ✅ Optional: test connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MySQL:', error);
    return false;
  }
};

// ✅ Initialize schema if needed
export const initializeDatabase = async () => {
  try {
    // Users table
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
        locked BOOLEAN NOT NULL DEFAULT FALSE,
        lockedUntil BIGINT DEFAULT NULL -- 🔥 New field for temporary lockout
      )
    `);

    // Customers table
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

    // Packages table
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

    // Insert default packages if not present
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM packages');
    const count = rows[0].count;

    if (count === 0) {
      await pool.execute(`
        INSERT INTO packages (id, name, description, price, speed, features) VALUES 
        ('1', 'Basic', 'Basic internet package for small households', 29.99, 100, '["100 Mbps", "Unlimited data", "Basic support"]'),
        ('2', 'Standard', 'Standard internet package for medium households', 49.99, 300, '["300 Mbps", "Unlimited data", "Priority support", "Free installation"]'),
        ('3', 'Premium', 'Premium internet package for large households', 79.99, 1000, '["1 Gbps", "Unlimited data", "24/7 Premium support", "Free installation", "Smart Wi-Fi"]')
      `);
      console.log('✅ Default packages inserted');
    }

    console.log('✅ MySQL tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};