/* UI OVERHAUL: Parsley Health-inspired doctor profile page.
 * - Sage green avatar, warm cards, earthy palette
 * - Serif headings, pill CTAs, rounded inputs */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useMyDoctorProfile,
  useUpdateDoctorProfile,
} from '@/hooks/use-doctors';
import { useAuth } from '@/contexts/auth.context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Pencil, X } from 'lucide-react';

const profileSchema = z.object({
  specialisation: z.string().min(1, 'Specialisation is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  bio: z.string().optional(),
  consultationFee: z.number().min(0, 'Fee must be 0 or more'),
});

const createProfileSchema = profileSchema;

type ProfileInput = z.infer<typeof profileSchema>;

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const { data: doctor, isLoading, refetch } = useMyDoctorProfile();
  const updateProfile = useUpdateDoctorProfile();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      specialisation: doctor?.specialisation || '',
      bio: doctor?.bio || '',
      consultationFee: doctor?.consultationFee || 0,
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    formState: { errors: createErrors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      specialisation: '',
      licenseNumber: '',
      bio: '',
      consultationFee: 0,
    },
  });

  const handleCreate = async (data: ProfileInput) => {
    setIsCreating(true);
    try {
      await api.post('/doctors', {
        specialisation: data.specialisation,
        licenseNumber: data.licenseNumber,
        bio: data.bio,
        consultationFee: data.consultationFee,
      });
      toast.success('Profile created successfully');
      refetch();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to create profile');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (data: ProfileInput) => {
    if (!doctor) return;
    try {
      await updateProfile.mutateAsync({
        id: doctor.id,
        data: {
          specialisation: data.specialisation,
          bio: data.bio,
          consultationFee: data.consultationFee,
        },
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update profile');
    }
  };

  const handleToggleAvailability = async () => {
    if (!doctor) return;
    try {
      await updateProfile.mutateAsync({
        id: doctor.id,
        data: { isAvailable: !doctor.isAvailable },
      });
      toast.success(
        `You are now ${doctor.isAvailable ? 'unavailable' : 'available'} for patients`,
      );
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update availability');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-8 w-48 bg-[#F5F0EB] rounded-xl animate-pulse" />
        <div className="h-64 bg-[#F5F0EB] rounded-xl animate-pulse" />
      </div>
    );
  }

  // No doctor profile yet — show create form
  if (!doctor) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
            My Profile
          </h1>
          <p className="text-[#7A7267] mt-1">
            Create your doctor profile to start accepting patients
          </p>
        </div>

        <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[#2D2D2D] font-heading">
              Create doctor profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateSubmit(handleCreate)}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="specialisation"
                  className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
                >
                  Specialisation
                </Label>
                <Input
                  id="specialisation"
                  placeholder="e.g. Cardiology, General Practice"
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                  {...registerCreate('specialisation')}
                />
                {createErrors.specialisation && (
                  <p className="text-sm text-[#C4604A]">
                    {createErrors.specialisation.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="licenseNumber"
                  className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
                >
                  License number
                </Label>
                <Input
                  id="licenseNumber"
                  placeholder="e.g. LIC-2024-001"
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                  {...registerCreate('licenseNumber')}
                />
                {createErrors.licenseNumber && (
                  <p className="text-sm text-[#C4604A]">
                    {createErrors.licenseNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="bio"
                  className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
                >
                  Bio (optional)
                </Label>
                <textarea
                  id="bio"
                  className="w-full min-h-24 rounded-xl border border-[#E8E2DA] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B7B6A]/20 focus:border-[#5B7B6A] transition-colors"
                  placeholder="Tell patients about your experience and expertise..."
                  {...registerCreate('bio')}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="consultationFee"
                  className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide"
                >
                  Consultation fee ($)
                </Label>
                <Input
                  id="consultationFee"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="150.00"
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                  {...registerCreate('consultationFee', {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has profile — show view/edit
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
            My Profile
          </h1>
          <p className="text-[#7A7267] mt-1">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAvailability}
            disabled={updateProfile.isPending}
            className={
              doctor.isAvailable
                ? 'rounded-full border-[#FDECEC] text-[#C4604A] hover:bg-[#FDECEC]'
                : 'rounded-full border-[#E8F0EC] text-[#5B7B6A] hover:bg-[#E8F0EC]'
            }
          >
            {doctor.isAvailable ? 'Set unavailable' : 'Set available'}
          </Button>
          <Button
            size="sm"
            variant={isEditing ? 'outline' : 'default'}
            className={
              isEditing
                ? 'rounded-full border-[#E8E2DA] text-[#5A5A5A]'
                : 'rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white'
            }
            onClick={() => {
              setIsEditing(!isEditing);
              if (!isEditing) {
                reset({
                  specialisation: doctor.specialisation,
                  bio: doctor.bio || '',
                  consultationFee: doctor.consultationFee,
                });
              }
            }}
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
      </div>

      {/* Profile card */}
      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardContent className="pt-6 space-y-5">
          {/* Avatar + status */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#5B7B6A] flex items-center justify-center text-white text-xl font-bold">
              {doctor.specialisation.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-[#2D2D2D] text-lg">
                Dr. {user?.email?.split('@')[0]}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={
                    doctor.isAvailable
                      ? 'bg-[#E8F0EC] text-[#5B7B6A] border-0'
                      : 'bg-[#FDECEC] text-[#C4604A] border-0'
                  }
                >
                  {doctor.isAvailable ? 'Available' : 'Unavailable'}
                </Badge>
                <span className="text-xs text-[#7A7267]">
                  ${doctor.consultationFee} / visit
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E8E2DA]" />

          {isEditing ? (
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                  Specialisation
                </Label>
                <Input
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                  {...register('specialisation')}
                />
                {errors.specialisation && (
                  <p className="text-sm text-[#C4604A]">
                    {errors.specialisation.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                  Bio
                </Label>
                <textarea
                  className="w-full min-h-24 rounded-xl border border-[#E8E2DA] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B7B6A]/20 focus:border-[#5B7B6A] transition-colors"
                  {...register('bio')}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                  Consultation fee ($)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                  {...register('consultationFee', { valueAsNumber: true })}
                />
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
            <div className="space-y-4">
              <InfoRow label="Specialisation" value={doctor.specialisation} />
              <InfoRow label="License number" value={doctor.licenseNumber} />
              <InfoRow
                label="Consultation fee"
                value={`$${doctor.consultationFee}`}
              />
              {doctor.bio && (
                <div>
                  <p className="text-xs font-medium text-[#7A7267] uppercase tracking-wide mb-1">
                    Bio
                  </p>
                  <p className="text-sm text-[#5A5A5A] leading-relaxed">
                    {doctor.bio}
                  </p>
                </div>
              )}
              <InfoRow label="Profile ID" value={doctor.id} mono />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#7A7267] uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p
        className={`text-sm text-[#2D2D2D] ${mono ? 'font-mono text-xs bg-[#F5F0EB] px-2 py-1 rounded-lg' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
