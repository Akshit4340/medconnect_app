/* UI OVERHAUL: Parsley Health-inspired patient profile page.
 * - Warm cards, sage green avatar, earthy palette
 * - Serif headings, rounded inputs, pill CTAs */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth.context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, X } from 'lucide-react';

const profileSchema = z.object({
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  medicalSummary: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type ProfileInput = z.infer<typeof profileSchema>;
type PatientProfile = {
  id: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalSummary?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

export default function PatientProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: async () => {
      const res = await api.get('/patients/me');
      return res.data.data as PatientProfile;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileInput) => {
      const payload = {
        ...data,
        allergies: data.allergies
          ? data.allergies.split(',').map((a: string) => a.trim())
          : [],
      };
      // If profile doesn't exist yet, create it; otherwise update
      const res = profile?.id
        ? await api.patch(`/patients/${profile.id}`, payload)
        : await api.post('/patients', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'profile'] });
      toast.success('Profile updated');
      setIsEditing(false);
    },
    onError: () => toast.error('Update failed'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  const startEditing = () => {
    reset({
      dateOfBirth: profile?.dateOfBirth
        ? new Date(profile.dateOfBirth).toISOString().split('T')[0]
        : '',
      bloodGroup: profile?.bloodGroup || '',
      allergies: profile?.allergies?.join(', ') || '',
      medicalSummary: profile?.medicalSummary || '',
      emergencyContactName: profile?.emergencyContactName || '',
      emergencyContactPhone: profile?.emergencyContactPhone || '',
    });
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 bg-[#F5F0EB] rounded-xl animate-pulse" />
        <div className="h-64 bg-[#F5F0EB] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
            My Profile
          </h1>
          <p className="text-[#7A7267] mt-1">{user?.email}</p>
        </div>
        <Button
          size="sm"
          variant={isEditing ? 'outline' : 'default'}
          className={
            isEditing
              ? 'rounded-full border-[#E8E2DA] text-[#5A5A5A]'
              : 'rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white'
          }
          onClick={() => (isEditing ? setIsEditing(false) : startEditing())}
        >
          {isEditing ? (
            <>
              <X size={14} className="mr-1" /> Cancel
            </>
          ) : (
            <>
              <Pencil size={14} className="mr-1" /> Edit profile
            </>
          )}
        </Button>
      </div>

      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardContent className="pt-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#5B7B6A] flex items-center justify-center text-white text-xl font-bold">
              {user?.email?.slice(0, 2).toUpperCase() || 'PT'}
            </div>
            <div>
              <p className="font-semibold text-[#2D2D2D] text-lg">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-[#7A7267] capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="border-t border-[#E8E2DA]" />

          {isEditing ? (
            <form
              onSubmit={handleSubmit((data) => updateProfile.mutate(data))}
              className="space-y-5 mt-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                    Date of birth
                  </Label>
                  <Input
                    type="date"
                    className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                    {...register('dateOfBirth')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                    Blood group
                  </Label>
                  <Input
                    placeholder="e.g. A+"
                    className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                    {...register('bloodGroup')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                  Allergies (comma-separated)
                </Label>
                <Input
                  placeholder="e.g. Penicillin, Peanuts"
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                  {...register('allergies')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                  Medical summary
                </Label>
                <textarea
                  className="w-full min-h-24 rounded-xl border border-[#E8E2DA] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B7B6A]/20 focus:border-[#5B7B6A] transition-colors"
                  placeholder="Any relevant medical history..."
                  {...register('medicalSummary')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                    Emergency contact
                  </Label>
                  <Input
                    placeholder="Name"
                    className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                    {...register('emergencyContactName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                    Emergency phone
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+1 555 000 0000"
                    className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                    {...register('emergencyContactPhone')}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex-1 rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white transition-colors"
                >
                  {updateProfile.isPending ? 'Saving...' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#E8E2DA] text-[#5A5A5A]"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 mt-5">
              <InfoRow
                label="Date of birth"
                value={
                  profile?.dateOfBirth
                    ? new Date(profile.dateOfBirth).toLocaleDateString()
                    : 'Not set'
                }
              />
              <InfoRow
                label="Blood group"
                value={profile?.bloodGroup || 'Not set'}
              />
              <InfoRow
                label="Allergies"
                value={profile?.allergies?.join(', ') || 'None'}
              />
              <InfoRow
                label="Medical summary"
                value={profile?.medicalSummary || 'Not set'}
              />
              <InfoRow
                label="Emergency contact"
                value={
                  profile?.emergencyContactName
                    ? `${profile.emergencyContactName} (${profile.emergencyContactPhone || 'no phone'})`
                    : 'Not set'
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#7A7267] uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-[#2D2D2D]">{value}</p>
    </div>
  );
}
