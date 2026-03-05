import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Input } from '../app/components/ui/input';
import { Label } from '../app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../app/components/ui/card';
import { useAuth } from '../lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../app/components/ui/tabs';

export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleLogin = (e: React.FormEvent, role: 'admin' | 'user') => {
    e.preventDefault();
    login(email, password, role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-3xl text-slate-900">SecureData</h1>
              <p className="text-slate-600">PII Sanitization Platform</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-12">
            <h2 className="text-4xl font-bold text-slate-900 leading-tight">
              Protect Sensitive Data with AI-Powered Sanitization
            </h2>
            <p className="text-lg text-slate-600">
              Automatically detect and sanitize PII across multiple file formats. 
              Ensure compliance and prevent data leaks with our enterprise-grade platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-2xl font-bold text-blue-600">99.9%</div>
              <div className="text-sm text-slate-600">Detection Accuracy</div>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-2xl font-bold text-blue-600">10+</div>
              <div className="text-sm text-slate-600">File Formats</div>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-2xl font-bold text-blue-600">RBAC</div>
              <div className="text-sm text-slate-600">Access Control</div>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-2xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-slate-600">Audit Trail</div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="user" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="user">User Login</TabsTrigger>
                  <TabsTrigger value="admin">Admin Login</TabsTrigger>
                </TabsList>

                <TabsContent value="user">
                  <form onSubmit={(e) => handleLogin(e, 'user')} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="user-email"
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="user-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                      Sign in as User
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="admin">
                  <form onSubmit={(e) => handleLogin(e, 'admin')} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="admin-email"
                          type="email"
                          placeholder="admin@example.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="admin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                      Sign in as Admin
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center text-sm text-slate-600">
                Demo credentials: Any email/password combination works
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Branding */}
        <div className="lg:hidden text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-semibold text-2xl text-slate-900">SecureData</h1>
          </div>
          <p className="text-slate-600">PII Sanitization Platform</p>
        </div>
      </div>
    </div>
  );
}
