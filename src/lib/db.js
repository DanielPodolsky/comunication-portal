import { pool } from './mysql';
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
// 🔐 User Login
// ==========================
export const loginUser = async (username, password) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) return null;

    const user = rows[0];

    if (user.locked) return null;

    const { hash } = await hashPassword(password, user.salt);

    if (hash === user.passwordHash) {
      await pool.execute(
        'UPDATE users SET failedLoginAttempts = 0 WHERE id = ?',
        [user.id]
      );

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        failedLoginAttempts: 0,
        locked: false
      };
    } else {
      const attempts = user.failedLoginAttempts + 1;
      const locked = attempts >= 3;

      await pool.execute(
        'UPDATE users SET failedLoginAttempts = ?, locked = ? WHERE id = ?',
        [attempts, locked, user.id]
      );

      return null;
    }
  } catch (error) {
    console.error('loginUser error:', error);
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

// ==========================
// 📦 Get Packages (Real DB)
// ==========================
export const getPackagesFromDB = async () => {
  try {
    const [rows] = await pool.execute('SELECT * FROM packages');
    return rows.map(pkg => ({
      ...pkg,
      features: JSON.parse(pkg.features)
    }));
  } catch (error) {
    console.error('getPackagesFromDB error:', error);
    return [];
  }
};

// ==========================
// Optional: export same functions under "vulnerable" aliases for toggling
// ==========================
export const createUserVulnerable = createUser;
export const loginUserVulnerable = loginUser;
export const createCustomerVulnerable = createCustomer;

// ==========================
// 🛠️ TODO: Implement as needed
// ==========================
export const requestPasswordReset = async () => { };
export const verifyResetToken = async () => { };
export const resetPassword = async () => { };
export const changePassword = async () => { };
export const getCustomersByUserId = async () => { };
export const getUserById = async () => { };
