import { pool } from './mysql.js';
import crypto from 'crypto';
import { getPasswordConfig } from './passwordConfig.js';
import dotenv from 'dotenv';
dotenv.config();
// Generate a secure random string
const generateRandomString = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate UUID
const generateUUID = () => {
  return crypto.randomUUID();
};

export const hashPassword = async (password) => {
  const generatedSalt = process.env.RESET_TOKEN_SECRET || crypto.randomBytes(16).toString('hex');

  // Use HMAC with SHA-1, using the salt as the secret key
  const hmac = crypto.createHmac('sha1', generatedSalt);
  hmac.update(password);
  const hash = hmac.digest('hex');

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

    // ✅ INCLUDE SALT HERE!
    const passwordHistory = JSON.stringify([{ hash, salt, createdAt: Date.now() }]);

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
// 👤 User Registration - VULNERABLE!
// ==========================
export const createUserVulnerable = async (username, email, password) => {
  try {
    const query = `
      INSERT INTO users (username, email, passwordHash, salt, passwordHistory)
      VALUES ('${username}', '${email}', '${password}', 'salt', '[]');
    `;

    console.log("⚠️ Running vulnerable SQL:\n", query);

    const [results] = await pool.query(query); // vulnerable - string interpolation!

    return {
      username,
      email
    };
  } catch (error) {
    console.error('❌ createUserVulnerable error:', error);
    return null;
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

    const hmac = crypto.createHmac('sha1', user.salt);
    hmac.update(password);
    const hash = hmac.digest('hex');

    console.log('Password Hash:', hash);
    console.log('User password', user.passwordHash);
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

    // 🔥 PRINT the user that was fetched via injection
    console.log('🚨 SQL Injection successful - Users fetched:', users);

    // 🛑 Trust the database result blindly
    return { success: true, users };
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
    console.log("I AM IN SECURE MODE");

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
    console.log("I AM IN VULNERABLE MODE");

    const { name, email, phone, address, packageId, userId } = customerData;

    await pool.query(
      `INSERT INTO customers (id, name, email, phone, address, packageId, userId)
      VALUES ('${id}', '${name}', '${email}', '${phone}', '${address}', '${packageId}', '${userId}')`);

    return {
      id,
      name,
      email,
      phone,
      address,
      packageId,
      userId
    };
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

export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return false;
    }

    const user = rows[0];

    const hmac = crypto.createHmac('sha1', user.salt);
    hmac.update(currentPassword);
    const currentHash = hmac.digest('hex');

    if (currentHash !== user.passwordHash) {
      return false; // Password doesn't match
    }

    let passwordHistory = [];
    try {
      if (typeof user.passwordHistory === 'string') {
        passwordHistory = JSON.parse(user.passwordHistory);
      } else {
        passwordHistory = user.passwordHistory || [];
      }
    } catch (error) {
      console.warn('Invalid password history format:', error);
      passwordHistory = [];
    }

    // Check if new password is same as current one
    const currentHmac = crypto.createHmac('sha1', user.salt);
    currentHmac.update(newPassword);
    const newPasswordHash = currentHmac.digest('hex');

    if (newPasswordHash === user.passwordHash) {
      return false; // Can't reuse current password
    }

    // בדיקה אם הסיסמה החדשה שומשה בעבר
    for (let i = 0; i < Math.min(3, passwordHistory.length); i++) {
      const prevHash = passwordHistory[i].hash;
      const prevSalt = passwordHistory[i].salt || user.salt; // fallback in case salt missing

      const testHmac = crypto.createHmac('sha1', prevSalt);
      testHmac.update(newPassword);
      const testHash = testHmac.digest('hex');

      if (testHash === prevHash) {
        return false; // New password matches a previous password
      }
    }

    // יצירת סיסמה חדשה
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHmac = crypto.createHmac('sha1', newSalt);
    newHmac.update(newPassword);
    const newHash = newHmac.digest('hex');

    // הוספת הרשומה להיסטוריה
    passwordHistory.unshift({ hash: newHash, salt: newSalt, createdAt: Date.now() });
    passwordHistory = passwordHistory.slice(0, 4); // רק 3 אחרונות

    // שמירה למסד
    await pool.execute(
      'UPDATE users SET passwordHash = ?, salt = ?, passwordHistory = ? WHERE id = ?',
      [newHash, newSalt, JSON.stringify(passwordHistory), userId]
    );

    return true;
  } catch (error) {
    console.error('changePassword error:', error);
    return false;
  }
};


// ==========================
// 🛠️ TODO: Implement as needed
// ==========================
export const requestPasswordReset = async () => { };
export const verifyResetToken = async () => { };
export const resetPassword = async () => { };
export const getCustomersByUserId = async () => { };
export const getUserById = async () => { };
