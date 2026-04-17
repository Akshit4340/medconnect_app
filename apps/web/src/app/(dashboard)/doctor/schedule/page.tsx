/* UI OVERHAUL: Parsley Health-inspired doctor schedule page.
 * - Warm earthy palette, sage green accents
 * - Rounded inputs and pill CTAs
 * BUG FIX: setState moved into useEffect (from Phase 1) */
'use client';

import { useState, useEffect } from 'react';
import { useMyDoctorProfile, useUpdateDoctorSlots } from '@/hooks/use-doctors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, CalendarClock } from 'lucide-react';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
};

export default function DoctorSchedulePage() {
  const { data: doctor, isLoading, error } = useMyDoctorProfile();
  const updateSlots = useUpdateDoctorSlots();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [initialized, setInitialized] = useState(false);

  // BUG FIX: Moved setState into useEffect to prevent calling setState
  // during render, which can cause infinite re-render loops.
  useEffect(() => {
    if (doctor && !initialized) {
      setInitialized(true);
    }
  }, [doctor, initialized]);

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
      },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (
    index: number,
    field: keyof Slot,
    value: string | number,
  ) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    );
  };

  const handleSave = async () => {
    if (!doctor) return;

    try {
      await updateSlots.mutateAsync({ doctorId: doctor.id, slots });
      toast.success('Schedule saved successfully');
    } catch (err) {
      toast.error('Failed to save schedule. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[#F5F0EB] rounded-xl animate-pulse" />
        <div className="h-48 bg-[#F5F0EB] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardContent className="pt-6">
          <div className="text-center py-12 space-y-3">
            <CalendarClock size={40} className="mx-auto text-[#5B7B6A]/30" />
            <p className="text-[#2D2D2D] font-medium">
              No doctor profile found
            </p>
            <p className="text-[#7A7267] text-sm">
              You need to create a doctor profile before managing your schedule.
            </p>
            <Button
              className="rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white transition-colors"
              onClick={async () => {
                toast.error(
                  'Please create your doctor profile first from the profile page.',
                );
              }}
            >
              Create profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          My Schedule
        </h1>
        <p className="text-[#7A7267] mt-1">
          Set your weekly availability for patient bookings
        </p>
      </div>

      {/* Doctor info strip */}
      <Card className="bg-white border-[#E8E2DA]/60 rounded-2xl shadow-sm shadow-black/5">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#2D2D2D]">
                {doctor.specialisation}
              </p>
              <p className="text-xs text-[#7A7267]">
                License: {doctor.licenseNumber}
              </p>
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Slots editor */}
      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#2D2D2D] font-heading">
              Availability slots
            </CardTitle>
            <Button
              size="sm"
              className="rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white transition-colors gap-1.5"
              onClick={addSlot}
            >
              <Plus size={14} />
              Add slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {slots.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock
                size={40}
                className="mx-auto text-[#5B7B6A]/30 mb-3"
              />
              <p className="text-[#7A7267] text-sm mb-3">
                No slots added yet. Click &ldquo;Add slot&rdquo; to define when
                patients can book you.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-[#E8E2DA] text-[#5B7B6A] hover:bg-[#E8F0EC] transition-colors gap-1.5"
                onClick={addSlot}
              >
                <Plus size={14} />
                Add your first slot
              </Button>
            </div>
          ) : (
            <>
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="grid grid-cols-5 gap-3 p-4 bg-[#FAF8F5] rounded-xl items-end"
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-[#7A7267] uppercase tracking-wide">
                      Day
                    </Label>
                    <select
                      className="w-full h-9 rounded-xl border border-[#E8E2DA] px-2 text-sm bg-white focus:border-[#5B7B6A] focus:outline-none transition-colors"
                      value={slot.dayOfWeek}
                      onChange={(e) =>
                        updateSlot(i, 'dayOfWeek', Number(e.target.value))
                      }
                    >
                      {DAYS.map((day, idx) => (
                        <option key={day} value={idx}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-[#7A7267] uppercase tracking-wide">
                      Start
                    </Label>
                    <Input
                      type="time"
                      value={slot.startTime}
                      className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                      onChange={(e) =>
                        updateSlot(i, 'startTime', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-[#7A7267] uppercase tracking-wide">
                      End
                    </Label>
                    <Input
                      type="time"
                      value={slot.endTime}
                      className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                      onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-[#7A7267] uppercase tracking-wide">
                      Duration
                    </Label>
                    <select
                      className="w-full h-9 rounded-xl border border-[#E8E2DA] px-2 text-sm bg-white focus:border-[#5B7B6A] focus:outline-none transition-colors"
                      value={slot.slotDurationMinutes}
                      onChange={(e) =>
                        updateSlot(
                          i,
                          'slotDurationMinutes',
                          Number(e.target.value),
                        )
                      }
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-[#FDECEC] text-[#C4604A] hover:bg-[#FDECEC] transition-colors gap-1"
                    onClick={() => removeSlot(i)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </Button>
                </div>
              ))}

              <div className="pt-3">
                <Button
                  className="w-full rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={handleSave}
                  disabled={updateSlots.isPending}
                >
                  {updateSlots.isPending
                    ? 'Saving...'
                    : `Save schedule (${slots.length} slot${slots.length !== 1 ? 's' : ''})`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
