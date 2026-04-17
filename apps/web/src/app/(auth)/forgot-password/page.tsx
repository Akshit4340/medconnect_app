/* UI OVERHAUL: Parsley Health-inspired forgot password page.
 * - Sage green pill CTAs, warm card, consistent styling */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  tenantSubdomain: z.string().min(1, 'Clinic subdomain required'),
});

type FormInput = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSubdomain: 'demo' },
  });

  const onSubmit = async (data: FormInput) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="shadow-xl shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardHeader className="pb-4 pt-8 px-8 text-center">
          {/* UI OVERHAUL: Lucide icon for visual feedback */}
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-[#E8F0EC] flex items-center justify-center">
              <MailCheck size={28} className="text-[#5B7B6A]" />
            </div>
          </div>
          <CardTitle className="text-xl text-[#2D2D2D] font-heading">
            Check your email
          </CardTitle>
          <CardDescription className="text-[#7A7267]">
            If that email exists, a reset link has been sent. Check your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full rounded-full border-[#E8E2DA] text-[#5B7B6A] hover:bg-[#E8F0EC] transition-colors"
            >
              Back to login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
      <CardHeader className="pb-4 pt-8 px-8">
        <CardTitle className="text-xl text-[#2D2D2D] font-heading">
          Forgot password
        </CardTitle>
        <CardDescription className="text-[#7A7267]">
          Enter your email and we&apos;ll send a reset link
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
              placeholder="you@clinic.com"
              className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A] focus:ring-[#5B7B6A]/20 bg-white"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-[#C4604A]">{errors.email.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white font-medium py-3 transition-all duration-200 shadow-sm hover:shadow-md"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
          <Link href="/login">
            <Button
              variant="ghost"
              className="w-full text-[#7A7267] hover:text-[#2D2D2D] hover:bg-[#F5F0EB] rounded-full transition-colors"
            >
              Back to login
            </Button>
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
