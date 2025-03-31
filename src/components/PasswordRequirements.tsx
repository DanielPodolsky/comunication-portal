
import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePassword } from '@/lib/passwordConfig';

interface PasswordRequirementsProps {
  password: string;
}

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const validation = validatePassword(password);
  const { requirements } = validation;
  const config = {
    minLength: 10, // This should match the config in passwordConfig.ts
  };

  return (
    <div className="requirements-list">
      <div className={`requirement-item ${requirements.length ? 'valid' : 'invalid'}`}>
        {requirements.length ? <Check size={12} className="requirement-icon" /> : <X size={12} className="requirement-icon" />}
        <span>At least {config.minLength} characters</span>
      </div>
      <div className={`requirement-item ${requirements.uppercase ? 'valid' : 'invalid'}`}>
        {requirements.uppercase ? <Check size={12} className="requirement-icon" /> : <X size={12} className="requirement-icon" />}
        <span>Contains uppercase letters</span>
      </div>
      <div className={`requirement-item ${requirements.lowercase ? 'valid' : 'invalid'}`}>
        {requirements.lowercase ? <Check size={12} className="requirement-icon" /> : <X size={12} className="requirement-icon" />}
        <span>Contains lowercase letters</span>
      </div>
      <div className={`requirement-item ${requirements.numbers ? 'valid' : 'invalid'}`}>
        {requirements.numbers ? <Check size={12} className="requirement-icon" /> : <X size={12} className="requirement-icon" />}
        <span>Contains numbers</span>
      </div>
      <div className={`requirement-item ${requirements.specialChars ? 'valid' : 'invalid'}`}>
        {requirements.specialChars ? <Check size={12} className="requirement-icon" /> : <X size={12} className="requirement-icon" />}
        <span>Contains special characters</span>
      </div>
      <div className={`requirement-item ${requirements.dictionary ? 'valid' : 'invalid'}`}>
        {requirements.dictionary ? <Check size={12} className="requirement-icon" /> : <X size={12} className="requirement-icon" />}
        <span>Doesn't contain common words</span>
      </div>
    </div>
  );
};

export default PasswordRequirements;
