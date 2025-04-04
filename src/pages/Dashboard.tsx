
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getPackages, createCustomer, createCustomerVulnerable, getCustomersByUserId } from '@/lib/db';
import Header from '@/components/Header';
import { Package, Customer } from '@/lib/db';
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [addedCustomer, setAddedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Load packages and customers on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Get packages
        const packagesData = getPackages();
        setPackages(packagesData);
        
        // Get customers if user is logged in
        if (user) {
          const customersData = await getCustomersByUserId(user.id);
          setCustomers(customersData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, toast]);

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim() || !packageId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    const customerData = {
      name,
      email,
      phone,
      address,
      packageId,
      userId: user.id
    };
    
    try {
      // Use secure or vulnerable version based on mode
      const result = isSecureMode 
        ? await createCustomer(customerData)
        : await createCustomerVulnerable(customerData);
      
      if (result) {
        toast({
          title: "Success",
          description: "Customer added successfully",
        });
        
        // Update customers list
        const updatedCustomers = await getCustomersByUserId(user.id);
        setCustomers(updatedCustomers);
        setAddedCustomer(result);
        
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setPackageId('');
      } else {
        toast({
          title: "Error",
          description: "Failed to add customer",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the customer",
        variant: "destructive"
      });
    }
  };

  const getPackageName = (id: string) => {
    const pkg = packages.find(p => p.id === id);
    return pkg ? pkg.name : 'Unknown Package';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                {addedCustomer && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="font-medium text-green-800 mb-2">
                      New customer added successfully!
                    </h3>
                    <p className="text-green-700">
                      Customer name: <span className="font-bold">{addedCustomer.name}</span>
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="font-medium mb-2">Total Customers</div>
                    <div className="text-2xl font-bold">{customers.length}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="font-medium mb-2">Available Packages</div>
                    <div className="text-2xl font-bold">{packages.length}</div>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mb-4">Your Customers</h3>
                
                {customers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Package
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customers.map((customer) => (
                          <tr key={customer.id}>
                            <td className="px-6 py-4 whitespace-nowrap" dangerouslySetInnerHTML={{ __html: customer.name }} />
                            <td className="px-6 py-4 whitespace-nowrap">{customer.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{customer.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getPackageName(customer.packageId)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No customers found. Add your first customer using the form.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Add New Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Customer Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="package">Internet Package</Label>
                    <Select onValueChange={setPackageId} value={packageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a package" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            <div className="flex items-center">
                              <Wifi className="w-4 h-4 mr-2 text-brand-blue" />
                              <span>{pkg.name} - ${pkg.price}/month</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button type="submit" className="w-full mt-6">
                    Add Customer
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Account Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to="/change-password">
                    <Button variant="outline" className="w-full">
                      Change Password
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
