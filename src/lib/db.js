import { pool } from './mysql.js';
import crypto from 'crypto';

// Generate a secure random string
const generateRandomString = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate UUID
const generateUUID = () => {
  return crypto.randomUUID();
};

// Hash password using PBKDF2
export const hashPassword = async (password, salt) => {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');

  // Use SHA-1 for hashing
  const hash = crypto
    .createHash('sha1')
    .update(password + generatedSalt) // password first, then salt
    .digest('hex');

  return {
    hash,
    salt: generatedSalt
  };
};


// ==========================
// 👤 User Registration
// ==========================
export const createUser = async (username, email, password) => {
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) return null;

    const id = generateUUID();
    const { hash, salt } = await hashPassword(password);

    const passwordHistory = JSON.stringify([{ hash, createdAt: Date.now() }]);

    await pool.execute(`
      INSERT INTO users (id, username, email, passwordHash, salt, passwordHistory, failedLoginAttempts, locked)
      VALUES (?, ?, ?, ?, ?, ?, 0, false)
    `, [id, username, email, hash, salt, passwordHistory]);

    return {
      id,
      username,
      email,
      failedLoginAttempts: 0,
      locked: false
    };
  } catch (error) {
    console.error('createUser error:', error);
    throw error;
  }
};

// ==========================
// 🔐 SECURE Login
// ==========================
// Update this function in your db.js file

export async function loginUser(username, password) {
  try {
    // Fetch the user
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) return null;

    const user = users[0];

    // Use SHA-1 for password verification
    const hash = crypto
      .createHash('sha1')
      .update(password + user.salt)
      .digest('hex');

    console.log('Login attempt - checking password hash matches');
    console.log('Generated hash:', hash);
    console.log('Stored hash:', user.passwordHash);

    // Check if the hash matches
    if (user.passwordHash === hash) {
      console.log('Login successful - password hash matched');
      return user;
    }

    console.log('Login failed - password hash did not match');
    return null;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// ==========================
// 💀 VULNERABLE Login (SQL Injection Demo)
// ==========================
export async function loginUserVulnerable(username, password) {
  try {
    // Using simple string concatenation is vulnerable to SQL injection
    const [users] = await pool.query(`SELECT * FROM users WHERE username = '${username}'`);
    if (users.length === 0) return null;

    const user = users[0];

    // Use SHA-1 for password verification
    const hash = crypto
      .createHash('sha1')
      .update(password + user.salt)
      .digest('hex');

    if (user.passwordHash === hash) {
      return user;
    }

    return null;
  } catch (error) {
    console.error('Vulnerable login error:', error);
    throw error;
  }
}
// ==========================
// 🧾 Create Customer (Real DB)
// ==========================
export const createCustomer = async (customerData) => {
  try {
    const id = generateUUID();

    const sanitized = {
      name: customerData.name.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      email: customerData.email.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      phone: customerData.phone.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      address: customerData.address.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      packageId: customerData.packageId,
      userId: customerData.userId
    };

    await pool.execute(
      `INSERT INTO customers (id, name, email, phone, address, packageId, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sanitized.name, sanitized.email, sanitized.phone, sanitized.address, sanitized.packageId, sanitized.userId]
    );

    return {
      id,
      ...sanitized
    };
  } catch (error) {
    console.error('createCustomer error:', error);
    return null;
  }
};

export const createCustomerVulnerable = async (customerData) => {
  try {
    const id = generateUUID();

    // 🔓 Don't sanitize input in vulnerable mode
    const unsanitized = {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      packageId: customerData.packageId,
      userId: customerData.userId
    };

    await pool.execute(
      `INSERT INTO customers (id, name, email, phone, address, packageId, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, unsanitized.name, unsanitized.email, unsanitized.phone, unsanitized.address, unsanitized.packageId, unsanitized.userId]
    );

    return { id, ...unsanitized };
  } catch (error) {
    console.error('createCustomerVulnerable error:', error);
    return null;
  }
};


// ==========================
// 📦 Get Packages (Real DB)
// ==========================
export const getPackagesFromDB = async () => {
  try {
    const [rows] = await pool.execute('SELECT * FROM packages');
    return rows.map(pkg => ({
      ...pkg,
      features: Array.isArray(pkg.features) ? pkg.features : []
    }));
  } catch (error) {
    console.error('getPackagesFromDB error:', error);
    return [];
  }
};


// ==========================
// 🛠️ TODO: Implement as needed
// ==========================
export const requestPasswordReset = async () => { };
export const verifyResetToken = async () => { };
export const resetPassword = async () => { };
export const changePassword = async () => { };
export const getCustomersByUserId = async () => { };
export const getUserById = async () => { };
