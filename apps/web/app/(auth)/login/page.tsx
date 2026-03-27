'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '../../../contexts/auth.context';
import { loginSchema, LoginInput } from '../../../lib/schemas';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSubdomain: 'demo',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password, data.tenantSubdomain);
      toast.success('Welcome back!', {
        description: 'Logged in successfully.',
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Invalid credentials';
      toast.error('Login failed', {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantSubdomain">Clinic</Label>
            <Input
              id="tenantSubdomain"
              placeholder="demo"
              {...register('tenantSubdomain')}
            />
            {errors.tenantSubdomain && (
              <p className="text-sm text-red-500">
                {errors.tenantSubdomain.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@clinic.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="text-center text-sm text-slate-500 space-y-1">
            <Link
              href="/forgot-password"
              className="block text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
            <span>
              No account?{' '}
              <Link href="/register" className="text-blue-600 hover:underline">
                Register
              </Link>
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
