
import { toast } from '@/hooks/use-toast';
import crypto from 'crypto';

// Simulating database with localStorage for demo
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  passwordHistory: string[];
  lastResetToken?: string;
  lastResetTokenExpiry?: number;
  failedLoginAttempts: number;
  locked: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  packageId: string;
  userId: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  speed: number;
  features: string[];
}

// Initialize database tables if they don't exist
const initializeDatabase = () => {
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([]));
  }
  if (!localStorage.getItem('customers')) {
    localStorage.setItem('customers', JSON.stringify([]));
  }
  if (!localStorage.getItem('packages')) {
    localStorage.setItem('packages', JSON.stringify([
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
    ]));
  }
};

// Initialize the database on module load
initializeDatabase();

// Hash password using HMAC + Salt
export const hashPassword = (password: string, salt?: string): { hash: string, salt: string } => {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', generatedSalt)
    .update(password)
    .digest('hex');
  
  return { hash, salt: generatedSalt };
};

// Generate SHA-1 token for password reset
export const generateResetToken = (): string => {
  const randomValue = crypto.randomBytes(16).toString('hex');
  return crypto.createHash('sha1').update(randomValue).digest('hex');
};

// User Services (Vulnerable Version)
export const createUserVulnerable = (username: string, email: string, password: string): User | null => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if user already exists
    const existingUser = users.find((u: User) => u.username === username || u.email === email);
    if (existingUser) {
      return null;
    }
    
    const { hash, salt } = hashPassword(password);
    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash: hash,
      salt,
      passwordHistory: [hash],
      failedLoginAttempts: 0,
      locked: false
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
  } catch (error) {
    console.error('Failed to create user:', error);
    return null;
  }
};

// User Services (Secure Version)
export const createUser = (username: string, email: string, password: string): User | null => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if user already exists (secure way)
    const existingUser = users.find((u: User) => 
      u.username === username || u.email === email
    );
    
    if (existingUser) {
      return null;
    }
    
    // Securely hash password
    const { hash, salt } = hashPassword(password);
    
    const newUser: User = {
      id: crypto.randomUUID(),
      username: username.trim(),
      email: email.trim(),
      passwordHash: hash,
      salt,
      passwordHistory: [hash],
      failedLoginAttempts: 0,
      locked: false
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
  } catch (error) {
    console.error('Failed to create user:', error);
    return null;
  }
};

// Vulnerable login
export const loginUserVulnerable = (username: string, password: string): User | null => {
  try {
    // This is vulnerable to SQL injection in a real database
    // For demo purposes, we're simulating the vulnerability
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: User) => u.username === username);
    
    if (!user) {
      return null;
    }
    
    if (user.locked) {
      return null;
    }
    
    const { hash } = hashPassword(password, user.salt);
    
    if (hash === user.passwordHash) {
      // Reset failed attempts on success
      user.failedLoginAttempts = 0;
      localStorage.setItem('users', JSON.stringify(users));
      return user;
    } else {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 3) {
        user.locked = true;
      }
      localStorage.setItem('users', JSON.stringify(users));
      return null;
    }
  } catch (error) {
    console.error('Failed to login:', error);
    return null;
  }
};

// Secure login
export const loginUser = (username: string, password: string): User | null => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Sanitize input and use parameterized query equivalent
    const sanitizedUsername = username.trim();
    const user = users.find((u: User) => u.username === sanitizedUsername);
    
    if (!user) {
      return null;
    }
    
    if (user.locked) {
      return null;
    }
    
    const { hash } = hashPassword(password, user.salt);
    
    if (hash === user.passwordHash) {
      // Reset failed attempts on success
      user.failedLoginAttempts = 0;
      localStorage.setItem('users', JSON.stringify(users));
      return user;
    } else {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 3) {
        user.locked = true;
        toast({
          title: "Account Locked",
          description: "Too many failed login attempts. Your account has been locked.",
          variant: "destructive"
        });
      }
      localStorage.setItem('users', JSON.stringify(users));
      return null;
    }
  } catch (error) {
    console.error('Failed to login:', error);
    return null;
  }
};

// Password reset functions
export const requestPasswordReset = (email: string): { success: boolean, token?: string } => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: User) => u.email === email);
    
    if (!user) {
      return { success: false };
    }
    
    const resetToken = generateResetToken();
    user.lastResetToken = resetToken;
    user.lastResetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // In a real app, you would send an email here
    // For this demo, we'll return the token directly
    return { success: true, token: resetToken };
  } catch (error) {
    console.error('Failed to request password reset:', error);
    return { success: false };
  }
};

export const verifyResetToken = (token: string): boolean => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: User) => u.lastResetToken === token);
    
    if (!user || !user.lastResetTokenExpiry || user.lastResetTokenExpiry < Date.now()) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to verify reset token:', error);
    return false;
  }
};

export const resetPassword = (token: string, newPassword: string): boolean => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: User) => u.lastResetToken === token);
    
    if (userIndex === -1 || !users[userIndex].lastResetTokenExpiry || users[userIndex].lastResetTokenExpiry < Date.now()) {
      return false;
    }
    
    const user = users[userIndex];
    const { hash, salt } = hashPassword(newPassword);
    
    // Check password history
    const isInHistory = user.passwordHistory.some(historyHash => {
      const checkHash = hashPassword(newPassword, user.salt).hash;
      return checkHash === historyHash;
    });
    
    if (isInHistory) {
      return false;
    }
    
    user.passwordHash = hash;
    user.salt = salt;
    user.lastResetToken = undefined;
    user.lastResetTokenExpiry = undefined;
    user.locked = false;
    user.failedLoginAttempts = 0;
    
    // Update password history
    user.passwordHistory.push(hash);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }
    
    users[userIndex] = user;
    localStorage.setItem('users', JSON.stringify(users));
    return true;
  } catch (error) {
    console.error('Failed to reset password:', error);
    return false;
  }
};

export const changePassword = (userId: string, currentPassword: string, newPassword: string): boolean => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: User) => u.id === userId);
    
    if (userIndex === -1) {
      return false;
    }
    
    const user = users[userIndex];
    
    // Verify current password
    const currentHash = hashPassword(currentPassword, user.salt).hash;
    if (currentHash !== user.passwordHash) {
      return false;
    }
    
    // Check password history
    const isInHistory = user.passwordHistory.some(historyHash => {
      const checkHash = hashPassword(newPassword, user.salt).hash;
      return checkHash === historyHash;
    });
    
    if (isInHistory) {
      return false;
    }
    
    // Set new password
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    
    // Update password history
    user.passwordHistory.push(hash);
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.shift();
    }
    
    users[userIndex] = user;
    localStorage.setItem('users', JSON.stringify(users));
    return true;
  } catch (error) {
    console.error('Failed to change password:', error);
    return false;
  }
};

// Customer Services (Vulnerable Version)
export const createCustomerVulnerable = (customerData: Omit<Customer, 'id'>): Customer | null => {
  try {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    
    const newCustomer: Customer = {
      ...customerData,
      id: crypto.randomUUID()
    };
    
    customers.push(newCustomer);
    localStorage.setItem('customers', JSON.stringify(customers));
    return newCustomer;
  } catch (error) {
    console.error('Failed to create customer:', error);
    return null;
  }
};

// Customer Services (Secure Version)
export const createCustomer = (customerData: Omit<Customer, 'id'>): Customer | null => {
  try {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    
    // Sanitize inputs to prevent XSS
    const sanitizedData = {
      name: customerData.name.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      email: customerData.email.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      phone: customerData.phone.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      address: customerData.address.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      packageId: customerData.packageId,
      userId: customerData.userId
    };
    
    const newCustomer: Customer = {
      ...sanitizedData,
      id: crypto.randomUUID()
    };
    
    customers.push(newCustomer);
    localStorage.setItem('customers', JSON.stringify(customers));
    return newCustomer;
  } catch (error) {
    console.error('Failed to create customer:', error);
    return null;
  }
};

export const getCustomersByUserId = (userId: string): Customer[] => {
  try {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    return customers.filter((c: Customer) => c.userId === userId);
  } catch (error) {
    console.error('Failed to get customers:', error);
    return [];
  }
};

export const getPackages = (): Package[] => {
  try {
    return JSON.parse(localStorage.getItem('packages') || '[]');
  } catch (error) {
    console.error('Failed to get packages:', error);
    return [];
  }
};

export const getUserById = (userId: string): User | null => {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find((u: User) => u.id === userId) || null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};
