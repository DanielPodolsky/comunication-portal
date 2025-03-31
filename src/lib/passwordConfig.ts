
// Password configuration that can be modified by system administrators
export interface PasswordConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  historyCount: number;
  maxLoginAttempts: number;
  dictionaryWords: string[];
}

// Default configuration
const defaultConfig: PasswordConfig = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  historyCount: 3,
  maxLoginAttempts: 3,
  dictionaryWords: ['password', 'admin', '123456', 'qwerty', 'welcome', 'test'],
};

// Save config to localStorage if it doesn't exist
if (!localStorage.getItem('passwordConfig')) {
  localStorage.setItem('passwordConfig', JSON.stringify(defaultConfig));
}

// Get current password configuration
export const getPasswordConfig = (): PasswordConfig => {
  try {
    const config = JSON.parse(localStorage.getItem('passwordConfig') || '{}');
    return { ...defaultConfig, ...config };
  } catch (error) {
    console.error('Error loading password configuration:', error);
    return defaultConfig;
  }
};

// Update password configuration
export const updatePasswordConfig = (newConfig: Partial<PasswordConfig>): PasswordConfig => {
  try {
    const currentConfig = getPasswordConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    localStorage.setItem('passwordConfig', JSON.stringify(updatedConfig));
    return updatedConfig;
  } catch (error) {
    console.error('Error updating password configuration:', error);
    return getPasswordConfig();
  }
};

// Validate password against configuration
export const validatePassword = (password: string): { 
  isValid: boolean; 
  errors: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
    dictionary: boolean;
  };
} => {
  const config = getPasswordConfig();
  const errors: string[] = [];
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
