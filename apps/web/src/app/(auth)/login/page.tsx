/* UI OVERHAUL: Parsley Health-inspired login page.
 * - Warm card with subtle shadow (no harsh borders)
 * - Sage green pill CTAs
 * - Charcoal text, earthy accents */
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
    /* UI OVERHAUL: Subtle large-spread shadow instead of harsh borders */
    <Card className="shadow-xl shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
      <CardHeader className="pb-4 pt-8 px-8">
        <CardTitle className="text-xl text-[#2D2D2D] font-heading">
          Sign in
        </CardTitle>
        <CardDescription className="text-[#7A7267]">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="tenantSubdomain"
              className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
            >
              Clinic
            </Label>
            <Input
              id="tenantSubdomain"
              placeholder="demo"
              className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A] focus:ring-[#5B7B6A]/20 bg-white"
              {...register('tenantSubdomain')}
            />
            {errors.tenantSubdomain && (
              <p className="text-sm text-[#C4604A]">
                {errors.tenantSubdomain.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@clinic.com"
              className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A] focus:ring-[#5B7B6A]/20 bg-white"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-[#C4604A]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A] focus:ring-[#5B7B6A]/20 bg-white"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-[#C4604A]">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* UI OVERHAUL: Pill-shaped (rounded-full) sage green CTA */}
          <Button
            type="submit"
            className="w-full rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white font-medium py-3 transition-all duration-200 shadow-sm hover:shadow-md"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="text-center text-sm text-[#7A7267] space-y-2 pt-2">
            <Link
              href="/forgot-password"
              className="block text-[#5B7B6A] hover:text-[#4A6A59] transition-colors font-medium"
            >
              Forgot password?
            </Link>
            <span>
              No account?{' '}
              <Link
                href="/register"
                className="text-[#5B7B6A] hover:text-[#4A6A59] transition-colors font-medium"
              >
                Register
              </Link>
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
