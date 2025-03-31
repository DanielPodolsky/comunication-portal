
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, ShieldAlert, AlertTriangle, LucideIcon } from 'lucide-react';

interface VulnerabilityCardProps {
  title: string;
  description: string;
  vulnerability: string;
  solution: string;
  icon: LucideIcon;
}

const VulnerabilityCard: React.FC<VulnerabilityCardProps> = ({
  title,
  description,
  vulnerability,
  solution,
  icon: Icon
}) => (
  <Card className="mb-6">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-red-500" />
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <Alert className="mb-4 border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-amber-700">Vulnerability</AlertTitle>
        <AlertDescription>
          {vulnerability}
        </AlertDescription>
      </Alert>
      
      <Alert className="border-green-300 bg-green-50">
        <Shield className="h-4 w-4 text-green-700" />
        <AlertTitle className="text-green-700">Solution</AlertTitle>
        <AlertDescription>
          {solution}
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

const SecurityInfo = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-brand-blue">Security Information</h1>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <span>Vulnerable Mode</span>
              </CardTitle>
              <CardDescription>
                When in Vulnerable mode, the application is intentionally insecure for demonstration purposes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 text-sm mb-4">
                ⚠️ This mode demonstrates common security vulnerabilities. Do not use it with real data.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span>Secure Mode</span>
              </CardTitle>
              <CardDescription>
                When in Secure mode, the application implements security best practices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-green-600 text-sm mb-4">
                ✓ This mode implements proper security measures to protect against common vulnerabilities.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">Vulnerabilities & Solutions</h2>
        
        <VulnerabilityCard
          title="Stored XSS (Cross-Site Scripting)"
          description="The customer management system is vulnerable to stored XSS in vulnerable mode."
          vulnerability="When adding a new customer, malicious JavaScript can be injected in the name field that will be executed when viewed in the customers list. For example, entering a name like: <script>alert('XSS')</script> or <img src='x' onerror='alert(\"XSS\")'>"
          solution="In secure mode, we sanitize input by escaping HTML special characters. The application uses the replace() method to convert < to &lt; and > to &gt; which prevents HTML injection."
          icon={AlertTriangle}
        />
        
        <VulnerabilityCard
          title="SQL Injection"
          description="The login, registration, and customer creation systems are vulnerable to SQL injection in vulnerable mode."
          vulnerability="In vulnerable mode, direct string concatenation would be used in SQL queries. For example, a malicious user could enter a username like: admin' -- to bypass authentication."
          solution="In secure mode, we use parameterized queries (simulated in our localStorage implementation) by properly validating and sanitizing inputs. We also use proper comparison methods that don't rely on string concatenation."
          icon={AlertTriangle}
        />
        
        <VulnerabilityCard
          title="Insecure Password Storage"
          description="Both modes use HMAC + Salt for password storage, but there are differences in implementation."
          vulnerability="While both versions use HMAC + Salt, the vulnerable version might not properly validate inputs or could have implementation issues."
          solution="The secure implementation properly validates inputs, uses strong cryptographic functions, enforces password complexity requirements, and maintains password history to prevent reuse."
          icon={AlertTriangle}
        />
        
        <div className="mt-8 text-center">
          <p className="mb-4">
            You can switch between secure and vulnerable modes using the button in the header.
          </p>
          <Link to="/">
            <button className="text-brand-blue hover:underline">Back to Home</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SecurityInfo;
