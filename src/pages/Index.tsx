import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Wifi, Shield, Check, Info, ShieldAlert } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-brand-blue">Welcome to Comunication_LTD</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted partner for high-speed internet solutions. Explore our packages and find the perfect connection for your needs.
          </p>

          {!user && (
            <div className="mt-8 flex justify-center gap-4">
              <Button
                onClick={() => navigate('/register')}
                className="bg-brand-blue hover:bg-blue-700 text-white"
                size="lg"
              >
                Sign Up Now
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                size="lg"
              >
                Login
              </Button>
            </div>
          )}
        </section>

        {user && (
          <div className="mb-12 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-brand-blue">Dashboard</h2>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-brand-blue hover:bg-blue-700 text-white"
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Our Internet Packages</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <Wifi className="w-10 h-10 mb-2 text-brand-blue" />
                <CardTitle>Basic Package</CardTitle>
                <CardDescription>Perfect for small households</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$29.99<span className="text-sm font-normal text-gray-500">/month</span></div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>100 Mbps download speed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Unlimited data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Basic technical support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-brand-blue hover:bg-blue-700">Select Plan</Button>
              </CardFooter>
            </Card>

            <Card className="border-brand-blue transition-all hover:shadow-lg">
              <CardHeader className="bg-brand-blue text-white rounded-t-lg">
                <Wifi className="w-10 h-10 mb-2" />
                <CardTitle className="text-white">Standard Package</CardTitle>
                <CardDescription className="text-gray-100">Ideal for medium households</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$49.99<span className="text-sm font-normal text-gray-500">/month</span></div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>300 Mbps download speed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Unlimited data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Priority technical support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Free installation</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-brand-blue hover:bg-blue-700">Select Plan</Button>
              </CardFooter>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <Wifi className="w-10 h-10 mb-2 text-brand-blue" />
                <CardTitle>Premium Package</CardTitle>
                <CardDescription>Best for large households & businesses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$79.99<span className="text-sm font-normal text-gray-500">/month</span></div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>1 Gbps download speed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Unlimited data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>24/7 Premium support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Free installation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Smart Wi-Fi system</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-brand-blue hover:bg-blue-700">Select Plan</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex items-start gap-4">
            <Info className="w-8 h-8 text-brand-blue flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold mb-2">About Our Security</h2>
              <p className="text-gray-700 mb-4">
                At Comunication_LTD, we take security seriously. This demonstration website showcases both secure and vulnerable implementations of common web features.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <ShieldAlert size={16} className="text-red-500" />
                    <span>Vulnerable Mode</span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    Demonstrates common security vulnerabilities like XSS and SQL injection for educational purposes.
                  </p>
                </div>
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Shield size={16} className="text-green-500" />
                    <span>Secure Mode</span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    Shows best practices for secure web development including input sanitization and parameter binding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p>© 2025 Comunication_LTD. All rights reserved.</p>
            <p className="text-sm text-gray-400 mt-2">
              This is a demo project showcasing secure authentication and customer management systems.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
