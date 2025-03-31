
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { requestPasswordReset, verifyResetToken, resetPassword } from '@/lib/db';
import Header from '@/components/Header';
import PasswordRequirements from '@/components/PasswordRequirements';
import { validatePassword } from '@/lib/passwordConfig';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    const result = requestPasswordReset(email);
    
    if (result.success) {
      toast({
        title: "Reset Email Sent",
        description: "Check your email for the reset token",
      });
      // For demo purposes, we'll show the token directly
      toast({
        title: "Demo Mode",
        description: `Your reset token is: ${result.token}`,
        variant: "default"
      });
      setStep(2);
    } else {
      toast({
        title: "Error",
        description: "Email not found in our records",
        variant: "destructive"
      });
    }
  };

  const handleVerifyToken = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setErrors({ token: 'Token is required' });
      return;
    }
    
    const isValid = verifyResetToken(token);
    
    if (isValid) {
      toast({
        title: "Token Verified",
        description: "You can now set a new password",
      });
      setStep(3);
    } else {
      toast({
        title: "Invalid Token",
        description: "The token is invalid or has expired",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const success = resetPassword(token, newPassword);
    
    if (success) {
      toast({
        title: "Password Reset Successful",
        description: "You can now login with your new password",
      });
      setStep(4);
    } else {
      toast({
        title: "Password Reset Failed",
        description: "Please try again or request a new reset token",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-brand-blue">
              Forgot Password
            </CardTitle>
            <CardDescription>
              {step === 1 && "Enter your email to reset your password"}
              {step === 2 && "Enter the reset token sent to your email"}
              {step === 3 && "Create a new password"}
              {step === 4 && "Password reset successful"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                </div>
                
                <Button type="submit" className="w-full mt-6">
                  Request Reset
                </Button>
              </form>
            )}
            
            {step === 2 && (
              <form onSubmit={handleVerifyToken} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Reset Token</Label>
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token"
                    className={errors.token ? "border-red-500" : ""}
                  />
                  {errors.token && <p className="text-red-500 text-xs">{errors.token}</p>}
                  <p className="text-xs text-gray-500">
                    Enter the token sent to your email address.
                  </p>
                </div>
                
                <Button type="submit" className="w-full mt-6">
                  Verify Token
                </Button>
              </form>
            )}
            
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                  <PasswordRequirements password={newPassword} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full mt-6">
                  Reset Password
                </Button>
              </form>
            )}
            
            {step === 4 && (
              <div className="text-center py-4">
                <p className="mb-4 text-green-600">
                  Your password has been reset successfully!
                </p>
                <Link to="/login">
                  <Button className="w-full">
                    Go to Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            {step < 4 && (
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link to="/login" className="text-brand-blue hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
