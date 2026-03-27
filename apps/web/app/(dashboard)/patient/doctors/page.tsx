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

type Doctor = {
  id: string;
  specialisation: string;
  licenseNumber: string;
  bio?: string;
  consultationFee: number;
  isAvailable: boolean;
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
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-slate-900">
          Appointment booked!
        </h2>
        <p className="text-slate-500">
          Your appointment with Dr. {selectedDoctor?.specialisation} has been
          confirmed for {new Date(selectedSlot).toLocaleString()}.
        </p>
        <Button
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find a doctor</h1>
        <p className="text-slate-500 mt-1">
          Search by specialisation and book instantly
        </p>
      </div>

      {/* Step 1 — Search */}
      {step === 'search' && (
        <>
          <div className="flex gap-3 max-w-md">
            <Input
              placeholder="Search by specialisation..."
              value={specialisation}
              onChange={(e) => setSpecialisation(e.target.value)}
            />
          </div>
          {isLoading ? (
            <p className="text-slate-500">Loading doctors...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <Card
                  key={doctor.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {doctor.specialisation}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          License: {doctor.licenseNumber}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700"
                      >
                        Available
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {doctor.bio && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {doctor.bio}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        ${doctor.consultationFee}
                        <span className="font-normal text-slate-500">
                          {' '}
                          / visit
                        </span>
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleSelectDoctor(doctor)}
                      >
                        Book now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {doctors.length === 0 && (
                <p className="text-slate-500 col-span-2 text-center py-8">
                  No doctors found. Try a different specialisation.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Step 2 — Pick slot */}
      {step === 'slots' && selectedDoctor && (
        <div className="max-w-lg space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setStep('search')}>
            ← Back to search
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Select a time slot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              {slotsLoading ? (
                <p className="text-slate-500 text-sm">Loading slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No available slots on this date. Try another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map(
                    (slot: { startTime: string; endTime: string }) => (
                      <Button
                        key={slot.startTime}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectSlot(slot.startTime)}
                        className="text-xs"
                      >
                        {new Date(slot.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Button>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 'confirm' && selectedDoctor && (
        <div className="max-w-lg space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setStep('slots')}>
            ← Back to slots
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Confirm booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Specialisation</span>
                  <span className="font-medium">
                    {selectedDoctor.specialisation}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Date & time</span>
                  <span className="font-medium">
                    {new Date(selectedSlot).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium">30 minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Fee</span>
                  <span className="font-medium">
                    ${selectedDoctor.consultationFee}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes for doctor (optional)</Label>
                <Input
                  placeholder="Describe your symptoms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
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
