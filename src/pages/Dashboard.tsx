import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Wifi } from 'lucide-react';

const Dashboard = () => {
  const { user, isSecureMode } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [packageId, setPackageId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addedCustomer, setAddedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch packages from backend
        const pkgRes = await fetch('http://localhost:3001/api/packages');
        const pkgJson = await pkgRes.json();
        if (pkgJson.success) setPackages(pkgJson.packages);

        // Fetch customers if user is logged in
        if (user) {
          const custRes = await fetch(`http://localhost:3001/api/customers/${user.id}`);
          const custJson = await custRes.json();
          if (custJson.success) setCustomers(custJson.customers);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, toast]);

  if (!user) return <Navigate to="/login" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !phone || !address || !packageId) {
      toast({ title: 'Validation Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    try {
      const endpoint = isSecureMode ? '/api/customers' : '/api/customers'; // Same endpoint for both modes
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, address, packageId, userId: user.id })
      });

      const data = await res.json();

      if (data.success && data.customer) {
        toast({ title: 'Success', description: 'Customer added successfully' });
        setAddedCustomer(data.customer);
        setCustomers(prev => [...prev, data.customer]);
        setName(''); setEmail(''); setPhone(''); setAddress(''); setPackageId('');
      } else {
        toast({ title: 'Error', description: 'Failed to add customer', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Add customer error:', error);
      toast({ title: 'Error', description: 'Error adding customer', variant: 'destructive' });
    }
  };

  const getPackageName = (id) => {
    const pkg = packages.find(p => p.id === id);
    return pkg ? pkg.name : 'Unknown Package';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow container mx-auto px-4 py-8">
        {/* ... UI stays the same ... */}
      </div>
    </div>
  );
};

export default Dashboard;