'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth.context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);

  // Get doctor profile to find doctorId
  const { data: doctorData } = useQuery({
    queryKey: ['my-doctor-profile'],
    queryFn: async () => {
      const res = await api.get('/doctors/search');
      return res.data;
    },
  });

  const updateSlots = useMutation({
    mutationFn: async ({ id, slots }: { id: string; slots: Slot[] }) => {
      const res = await api.put(`/doctors/${id}/slots`, { slots });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Schedule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['my-doctor-profile'] });
    },
    onError: () => {
      toast.error('Failed to update schedule');
    },
  });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
        <p className="text-slate-500 mt-1">Set your weekly availability</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Availability slots</CardTitle>
            <Button size="sm" onClick={addSlot}>
              Add slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {slots.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              No slots added. Click "Add slot" to define your availability.
            </p>
          ) : (
            slots.map((slot, i) => (
              <div
                key={i}
                className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg items-end"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Day</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm bg-white"
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
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => removeSlot(i)}
                >
                  Remove
                </Button>
              </div>
            ))
          )}

          {slots.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Your doctor ID</Label>
                <Input
                  placeholder="Paste your doctor ID here"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                />
                <p className="text-xs text-slate-400">
                  Find it from GET /doctors/search response
                </p>
              </div>
              <Button
                className="w-full"
                disabled={!doctorId || updateSlots.isPending}
                onClick={() => updateSlots.mutate({ id: doctorId, slots })}
              >
                {updateSlots.isPending ? 'Saving...' : 'Save schedule'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
