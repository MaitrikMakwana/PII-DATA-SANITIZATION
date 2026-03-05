import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Users } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { WavyBackground } from '../app/components/ui/wavy-background';
import { NoiseBackground } from '../app/components/ui/noise-background';
import { motion } from 'motion/react';

export function NewLandingPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'user'>('admin');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate loading for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    login(email, password, loginType);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Section with Wavy Background */}
      <WavyBackground
        backgroundFill="linear-gradient(to bottom, #0f172a, #1e293b)"
        colors={['#3b82f6', '#8b5cf6', '#6366f1', '#a855f7', '#06b6d4']}
        waveOpacity={0.3}
        speed="slow"
        containerClassName="min-h-screen"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-2xl"
              >
                <Shield className="w-7 h-7 text-white" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                SecureData
              </h1>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base text-slate-300"
            >
              Enterprise PII Sanitization Platform
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            {/* Left Column - Hero Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="space-y-8 lg:pt-8"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                  Protect Sensitive Data with{' '}
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    AI-Powered Intelligence
                  </span>
                </h2>
                <p className="text-base text-slate-300 leading-relaxed">
                  Automatically detect, classify, and sanitize personally identifiable 
                  information across your entire data ecosystem. Ensure compliance and 
                  prevent data breaches.
                </p>
              </div>
            </motion.div>

            {/* Right Column - Glass Morphism Login Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex items-start justify-center"
            >
              {/* Glass Morphism Card */}
              <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8">
                {/* Role Selector */}
                <div className="flex gap-3 mb-8 p-1 bg-slate-800/60 rounded-2xl">
                  <button
                    onClick={() => setLoginType('admin')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      loginType === 'admin'
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 shadow-lg'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => setLoginType('user')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      loginType === 'user'
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 shadow-lg'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Staff</span>
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email Input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      placeholder={loginType === 'admin' ? 'Admin Email' : 'User Email'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full h-14 pl-12 pr-4 bg-slate-800/40 border border-slate-600/50 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full h-14 pl-12 pr-12 bg-slate-800/40 border border-slate-600/50 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Login Button with NoiseBackground */}
                  <div className="pt-2">
                    <NoiseBackground
                      containerClassName="w-full p-[2px] rounded-full"
                      gradientColors={[
                        'rgb(59, 130, 246)',
                        'rgb(139, 92, 246)',
                        'rgb(236, 72, 153)',
                      ]}
                    >
                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full h-14 rounded-full bg-black text-white font-semibold text-base transition-all duration-100 flex items-center justify-center gap-2 ${
                          isLoading ? 'cursor-not-allowed opacity-90' : 'cursor-pointer active:scale-95'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Login as {loginType === 'admin' ? 'Admin' : 'Staff'}</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </NoiseBackground>
                  </div>
                </form>

                {/* Forgot Password */}
                <div className="text-center mt-6">
                  <button className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Forgot Password?
                  </button>
                </div>

                {/* Demo Info */}
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-3">
                      🎯 <strong className="text-slate-300">Demo Mode</strong>
                    </p>
                    <div className="space-y-2 text-xs text-slate-500">
                      <p>Admin: admin@pill.com / admin</p>
                      <p>User: user@pill.com / user</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </WavyBackground>
    </div>
  );
}
