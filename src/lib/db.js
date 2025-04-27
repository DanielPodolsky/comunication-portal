import { pool } from './mysql.js';
import crypto from 'crypto';
import { getPasswordConfig } from './passwordConfig.js';
// Generate a secure random string
const generateRandomString = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate UUID
const generateUUID = () => {
  return crypto.randomUUID();
};

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

    const passwordHistory = JSON.stringify([{ hash, createdAt: Date.now() }]); // CHECK LATER

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
    const config = getPasswordConfig();

    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return { success: false, error: "Invalid username or password" };
    }

    let user = users[0];

    // 🚨 Check if temporarily locked
    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      const secondsLeft = Math.floor((user.lockedUntil - Date.now()) / 1000);
      return { success: false, error: `Account temporarily locked. Try again in ${secondsLeft} seconds`, locked: true };
    }

    // 🚀 If lock has expired, clean it
    if (user.lockedUntil && Date.now() >= user.lockedUntil) {
      await pool.execute(
        `UPDATE users SET failedLoginAttempts = 0, lockedUntil = NULL WHERE id = ?`,
        [user.id]
      );
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const hash = crypto
      .createHash('sha1')
      .update(password + user.salt)
      .digest('hex');

    if (user.passwordHash === hash) {
      // ✅ Successful login → Reset failed attempts
      await pool.execute(
        `UPDATE users SET failedLoginAttempts = 0, lockedUntil = NULL WHERE id = ?`,
        [user.id]
      );
      return { success: true, user };
    } else {
      // ❌ Wrong password
      const newFailedAttempts = user.failedLoginAttempts + 1;

      if (newFailedAttempts >= config.maxLoginAttempts) {
        // 🚨 Lock account for 3 minutes
        const threeMinutesFromNow = Date.now() + 3 * 60 * 1000;

        await pool.execute(
          `UPDATE users SET failedLoginAttempts = ?, lockedUntil = ? WHERE id = ?`,
          [newFailedAttempts, threeMinutesFromNow, user.id]
        );

        return { success: false, error: `Account locked after ${config.maxLoginAttempts} failed attempts. Try again in 3 minutes.`, locked: true };
      } else {
        await pool.execute(
          `UPDATE users SET failedLoginAttempts = ? WHERE id = ?`,
          [newFailedAttempts, user.id]
        );

        // 🛠️ Refetch the updated user failedLoginAttempts (optional but cleaner)
        // const [updatedUsers] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        // user = updatedUsers[0];

        return { success: false, error: `Invalid password. ${config.maxLoginAttempts - newFailedAttempts} attempts left.` };
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Internal server error' };
  }
}



// ==========================
// 💀 VULNERABLE Login (SQL Injection Demo)
// ==========================
export async function loginUserVulnerable(username, password) {
  try {
    // 🚨 VULNERABLE: SQL Injection possible here
    const [users] = await pool.query(`
      SELECT * FROM users WHERE username = '${username}'
    `);

    if (users.length === 0) {
      return { success: false, error: "Invalid username" };
    }

    const user = users[0];

    // 🔥 PRINT the user that was fetched via injection
    console.log('🚨 SQL Injection successful - User fetched:', user);

    // 🛑 Trust the database result blindly
    return { success: true, user };
  } catch (error) {
    console.error('Vulnerable login error:', error);
    return { success: false, error: "Internal server error" };
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
