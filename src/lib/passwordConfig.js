// Password configuration that can be modified by system administrators
const defaultConfig = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  historyCount: 3,
  maxLoginAttempts: 3,
  dictionaryWords: ['password', 'admin', '123456', 'qwerty', 'welcome', 'test'],
};

// Get current password configuration
export const getPasswordConfig = () => {
  return defaultConfig;
};

// Update password configuration (optional, but typically this should be DB-driven)
export const updatePasswordConfig = (newConfig) => {
  // In this basic version, we simply merge and replace in-memory
  Object.assign(defaultConfig, newConfig);
  return defaultConfig;
};

// Validate password against configuration
export const validatePassword = (password) => {
  const config = getPasswordConfig();
  const errors = [];
  const requirements = {
    length: password.length >= config.minLength,
    uppercase: !config.requireUppercase || /[A-Z]/.test(password),
    lowercase: !config.requireLowercase || /[a-z]/.test(password),
    numbers: !config.requireNumbers || /\d/.test(password),
    specialChars: !config.requireSpecialChars || /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    dictionary: !config.dictionaryWords.some(word =>
      password.toLowerCase().includes(word.toLowerCase())
    ),
  };

  if (!requirements.length) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  if (!requirements.uppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!requirements.lowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!requirements.numbers) {
    errors.push('Password must contain at least one number');
  }

  if (!requirements.specialChars) {
    errors.push('Password must contain at least one special character');
  }

  if (!requirements.dictionary) {
    errors.push('Password contains a common word that is not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  };
};
