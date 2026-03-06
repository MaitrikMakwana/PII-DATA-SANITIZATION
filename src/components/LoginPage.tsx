import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Input } from '../app/components/ui/input';
import { Label } from '../app/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../app/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../app/components/ui/input-otp';
import { Field, FieldDescription, FieldLabel } from '../app/components/ui/field';
import { useAuth } from '../lib/auth-context';
import { authApi } from '../lib/api';

type ForgotStep = 'email' | 'otp' | 'newpass' | 'done';

export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('email');
    setForgotEmail('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setForgotError('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      setForgotStep('otp');
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setForgotError('');
    setForgotLoading(true);
    try {
      const { resetToken: token } = await authApi.verifyOtp(forgotEmail, otp);
      setResetToken(token);
      setForgotStep('newpass');
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setForgotStep('done');
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">

      {/* ── Forgot Password Modal ──────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 shadow-2xl">

            {/* Step 1 — Enter email */}
            {forgotStep === 'email' && (
              <>
                <CardHeader>
                  <CardTitle>Forgot password?</CardTitle>
                  <CardDescription>Enter your email and we'll send you a 6-digit code.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    {forgotError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {forgotError}
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="forgot-email">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={forgotLoading} className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                        {forgotLoading ? 'Sending…' : 'Send Code'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowForgot(false)}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}

            {/* Step 2 — Enter OTP */}
            {forgotStep === 'otp' && (
              <>
                <CardHeader>
                  <CardTitle>Verify your email</CardTitle>
                  <CardDescription>
                    Enter the 6-digit code sent to{' '}
                    <span className="font-medium text-slate-900">{forgotEmail}</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="otp-input">Verification code</FieldLabel>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={forgotLoading}
                        onClick={async () => {
                          setForgotError('');
                          setForgotLoading(true);
                          try { await authApi.forgotPassword(forgotEmail); }
                          catch { /* silent */ }
                          finally { setForgotLoading(false); setOtp(''); }
                        }}
                        className="gap-1 text-xs h-7"
                      >
                        <RefreshCw className="h-3 w-3" /> Resend
                      </Button>
                    </div>

                    <div className="py-2">
                      <InputOTP
                        id="otp-input"
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                      >
                        <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator className="mx-2" />
                        <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {forgotError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {forgotError}
                      </div>
                    )}

                    <FieldDescription>Didn't get the code? Check your spam folder or resend above.</FieldDescription>
                  </Field>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6 || forgotLoading}
                  >
                    {forgotLoading ? 'Verifying…' : 'Verify Code'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setShowForgot(false)}>Cancel</Button>
                </CardFooter>
              </>
            )}

            {/* Step 3 — Set new password */}
            {forgotStep === 'newpass' && (
              <>
                <CardHeader>
                  <CardTitle>Set new password</CardTitle>
                  <CardDescription>Choose a strong password (min. 8 characters).</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {forgotError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {forgotError}
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="new-password">New password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="new-password"
                          type={showNewPw ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          className="pl-10 pr-10"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(v => !v)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={forgotLoading} className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                        {forgotLoading ? 'Saving…' : 'Reset Password'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowForgot(false)}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}

            {/* Step 4 — Done */}
            {forgotStep === 'done' && (
              <>
                <CardHeader>
                  <CardTitle>Password reset!</CardTitle>
                  <CardDescription>Your password has been updated. You can now sign in.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm text-center">
                    ✓ Password changed successfully.
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowForgot(false)}>
                    Back to Sign In
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      )}

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
                Sign in with your account credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs space-y-1">
                <p className="font-semibold text-blue-800">Demo Credentials</p>
                <p className="text-blue-700"><span className="font-medium">Admin:</span> piisanitize@gmail.com / Admin@123</p>
                <p className="text-blue-700"><span className="font-medium">User:</span> kachhiyadarshan6514@gmail.com / Dar@1234</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={openForgot}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
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

