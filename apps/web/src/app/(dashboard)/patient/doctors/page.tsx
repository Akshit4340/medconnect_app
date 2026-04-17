/* UI OVERHAUL: Parsley Health-inspired find doctors page.
 * - Warm doctor cards with sage green accents
 * - Pill-shaped CTAs, rounded inputs
 * - Multi-step booking flow with consistent styling */
'use client';

import { useState } from 'react';
import { useDoctors } from '../../../../hooks/use-doctors';
import {
  useAvailableSlots,
  useCreateAppointment,
} from '../../../../hooks/use-appointments';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Badge } from '../../../../components/ui/badge';
import { toast } from 'sonner';
import { Search, ArrowLeft, CheckCircle, PartyPopper } from 'lucide-react';

type Doctor = {
  id: string;
  specialisation: string;
  licenseNumber: string;
  bio?: string;
  consultationFee: number;
  isAvailable: boolean;
};

type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

export default function FindDoctorsPage() {
  const [specialisation, setSpecialisation] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'search' | 'slots' | 'confirm' | 'success'>(
    'search',
  );

  const { data, isLoading } = useDoctors({
    specialisation: specialisation || undefined,
    isAvailable: true,
  });

  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(
    selectedDoctor?.id || '',
    selectedDate,
  );

  const createAppointment = useCreateAppointment();

  const doctors: Doctor[] = data?.data || [];
  const availableSlots =
    slots?.filter((s: { available: boolean }) => s.available) || [];

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStep('slots');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleSelectSlot = (startTime: string) => {
    setSelectedSlot(startTime);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    try {
      await createAppointment.mutateAsync({
        doctorId: selectedDoctor.id,
        scheduledAt: selectedSlot,
        durationMinutes: 30,
        notes,
      });
      setStep('success');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Booking failed';
      toast.error(message);
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-5">
        <div className="w-20 h-20 rounded-full bg-[#E8F0EC] mx-auto flex items-center justify-center">
          <PartyPopper size={40} className="text-[#5B7B6A]" />
        </div>
        <h2 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          Appointment booked!
        </h2>
        <p className="text-[#7A7267]">
          Your appointment with Dr. {selectedDoctor?.specialisation} has been
          confirmed for {new Date(selectedSlot).toLocaleString()}.
        </p>
        <Button
          className="rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white transition-colors px-8"
          onClick={() => {
            setStep('search');
            setSelectedDoctor(null);
            setSelectedSlot('');
          }}
        >
          Book another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          Find a doctor
        </h1>
        <p className="text-[#7A7267] mt-1">
          Search by specialisation and book instantly
        </p>
      </div>

      {/* Step 1 — Search */}
      {step === 'search' && (
        <>
          <div className="flex gap-3 max-w-md">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09A90]"
              />
              <Input
                placeholder="Search by specialisation..."
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
                className="pl-9 rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-40 bg-white rounded-2xl animate-pulse shadow-sm"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {doctors.map((doctor) => (
                <Card
                  key={doctor.id}
                  className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl hover:shadow-md transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base text-[#2D2D2D]">
                          {doctor.specialisation}
                        </CardTitle>
                        <p className="text-xs text-[#7A7267] mt-0.5">
                          License: {doctor.licenseNumber}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-[#E8F0EC] text-[#5B7B6A] border-0"
                      >
                        Available
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {doctor.bio && (
                      <p className="text-sm text-[#5A5A5A] line-clamp-2">
                        {doctor.bio}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#2D2D2D]">
                        ${doctor.consultationFee}
                        <span className="font-normal text-[#7A7267]">
                          {' '}
                          / visit
                        </span>
                      </span>
                      <Button
                        size="sm"
                        className="rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white transition-colors"
                        onClick={() => handleSelectDoctor(doctor)}
                      >
                        Book now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {doctors.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <Search
                    size={40}
                    className="mx-auto text-[#5B7B6A]/30 mb-3"
                  />
                  <p className="text-[#7A7267]">
                    No doctors found. Try a different specialisation.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Step 2 — Pick slot */}
      {step === 'slots' && selectedDoctor && (
        <div className="max-w-lg space-y-5">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#5B7B6A] hover:bg-[#E8F0EC] rounded-full gap-1"
            onClick={() => setStep('search')}
          >
            <ArrowLeft size={14} />
            Back to search
          </Button>
          <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-[#2D2D2D] font-heading">
                Select a time slot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                  Date
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                />
              </div>
              {slotsLoading ? (
                <p className="text-[#7A7267] text-sm">Loading slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-[#7A7267] text-sm">
                  No available slots on this date. Try another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot: TimeSlot) => (
                    <Button
                      key={slot.startTime}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectSlot(slot.startTime)}
                      className="text-xs rounded-full border-[#E8E2DA] text-[#5A5A5A] hover:bg-[#E8F0EC] hover:text-[#3D5A4A] hover:border-[#5B7B6A] transition-colors"
                    >
                      {new Date(slot.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 'confirm' && selectedDoctor && (
        <div className="max-w-lg space-y-5">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#5B7B6A] hover:bg-[#E8F0EC] rounded-full gap-1"
            onClick={() => setStep('slots')}
          >
            <ArrowLeft size={14} />
            Back to slots
          </Button>
          <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-[#2D2D2D] font-heading">
                Confirm booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-[#FAF8F5] rounded-xl p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A7267]">Specialisation</span>
                  <span className="font-medium text-[#2D2D2D]">
                    {selectedDoctor.specialisation}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A7267]">Date & time</span>
                  <span className="font-medium text-[#2D2D2D]">
                    {new Date(selectedSlot).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A7267]">Duration</span>
                  <span className="font-medium text-[#2D2D2D]">30 minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A7267]">Fee</span>
                  <span className="font-medium text-[#2D2D2D]">
                    ${selectedDoctor.consultationFee}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5A5A5A] text-xs font-medium uppercase tracking-wide">
                  Notes for doctor (optional)
                </Label>
                <Input
                  placeholder="Describe your symptoms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl border-[#E8E2DA] focus:border-[#5B7B6A]"
                />
              </div>
              <Button
                className="w-full rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={handleConfirm}
                disabled={createAppointment.isPending}
              >
                {createAppointment.isPending
                  ? 'Booking...'
                  : 'Confirm appointment'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
