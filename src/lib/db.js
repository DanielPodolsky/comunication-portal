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
  const generatedSalt = salt || generateRandomString(16);

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, generatedSalt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt: generatedSalt
      });
    });
  });
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
export const loginUser = async (username, password) => {
  try {
    // First, get the salt for the user
    const [users] = await pool.execute(
      'SELECT id, salt FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) return null;
    const { salt, id } = users[0];

    // Hash with the retrieved salt
    const { hash } = await hashPassword(password, salt);

    // Now verify both username and passwordHash in DB
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND passwordHash = ?',
      [username, hash]
    );

    if (rows.length === 0) {
      // wrong password: increment failed login attempts
      await pool.execute(
        'UPDATE users SET failedLoginAttempts = failedLoginAttempts + 1 WHERE id = ?',
        [id]
      );

      // Check if it needs to be locked
      const [[updatedUser]] = await pool.execute('SELECT failedLoginAttempts FROM users WHERE id = ?', [id]);
      if (updatedUser.failedLoginAttempts >= 3) {
        await pool.execute('UPDATE users SET locked = true WHERE id = ?', [id]);
      }

      return null;
    }

    const user = rows[0];
    if (user.locked) return null;

    // success: reset failed attempts
    await pool.execute('UPDATE users SET failedLoginAttempts = 0 WHERE id = ?', [user.id]);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      failedLoginAttempts: 0,
      locked: false
    };

  } catch (error) {
    console.error('loginUser error:', error);
    throw error;
  }
};

// ==========================
// 💀 VULNERABLE Login (SQL Injection Demo)
// ==========================
export const loginUserVulnerable = async (username, _password) => {
  try {
    // this allows injection!
    const sql = `SELECT * FROM users WHERE username = '${username}'`;
    console.log('🔥 VULNERABLE SQL:', sql);

    const [rows] = await pool.query(sql);
    console.log('📦 VULNERABLE RESULT:', rows);

    if (rows.length === 0) return null;

    const user = rows[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      failedLoginAttempts: user.failedLoginAttempts,
      locked: user.locked,
    };
  } catch (error) {
    console.error('loginUserVulnerable error:', error);
    throw error;
  }
};


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
