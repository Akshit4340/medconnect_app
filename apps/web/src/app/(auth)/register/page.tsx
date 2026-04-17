/* UI OVERHAUL: Parsley Health-inspired register page.
 * - Sage green pill CTA, serif header, warm card styling
 * - Consistent with login page design language */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuth } from '../../../contexts/auth.context';
import { registerSchema, RegisterInput } from '../../../lib/schemas';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'patient',
      tenantSubdomain: 'demo',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      await registerUser(data);
      toast.success('Account created!', {
        description: 'Welcome to MedConnect.',
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Registration failed';
      toast.error('Registration failed', {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
      <CardHeader className="pb-4 pt-8 px-8">
        <CardTitle className="text-xl text-[#2D2D2D] font-heading">
          Create account
        </CardTitle>
        <CardDescription className="text-[#7A7267]">
          Join your clinic on MedConnect
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="tenantSubdomain"
              className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
            >
              Clinic subdomain
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
              >
                First name
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A] focus:ring-[#5B7B6A]/20 bg-white"
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-sm text-[#C4604A]">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
              >
                Last name
              </Label>
              <Input
                id="lastName"
                placeholder="Smith"
                className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A] focus:ring-[#5B7B6A]/20 bg-white"
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-sm text-[#C4604A]">
                  {errors.lastName.message}
                </p>
              )}
            </div>
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
              placeholder="john@clinic.com"
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

          <div className="space-y-2">
            <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
              I am a
            </Label>
            <Select
              defaultValue="patient"
              onValueChange={(val) =>
                setValue('role', val as 'patient' | 'doctor')
              }
            >
              <SelectTrigger className="rounded-xl border-[#E8E2DA]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* UI OVERHAUL: Pill-shaped sage green CTA */}
          <Button
            type="submit"
            className="w-full rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white font-medium py-3 transition-all duration-200 shadow-sm hover:shadow-md"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-[#7A7267] pt-1">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[#5B7B6A] hover:text-[#4A6A59] transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
