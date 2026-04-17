/* UI OVERHAUL: Parsley Health-inspired doctor appointments page.
 * - Earthy status badges, sage green pill CTAs
 * - Warm card backgrounds, rounded corners */
'use client';

import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { CalendarX } from 'lucide-react';
import Link from 'next/link';

type Appointment = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  patientId: string;
  notes?: string;
};

/* UI OVERHAUL: Earthy status colors */
const statusColors: Record<string, string> = {
  pending: 'bg-[#FFF3E8] text-[#C4874A]',
  confirmed: 'bg-[#E8F0EC] text-[#5B7B6A]',
  completed: 'bg-[#E8EDF5] text-[#5A6B8A]',
  cancelled: 'bg-[#FDECEC] text-[#C4604A]',
};

export default function DoctorAppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useAppointments(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const updateStatus = useUpdateAppointmentStatus();

  const appointments: Appointment[] = data?.data || [];

  const handleUpdate = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Appointment ${status}`);
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          All Appointments
        </h1>
        <p className="text-[#7A7267] mt-1">Manage your patient appointments</p>
      </div>

      {/* UI OVERHAUL: Pill-shaped filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            className={
              statusFilter === s
                ? 'rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white'
                : 'rounded-full border-[#E8E2DA] text-[#5A5A5A] hover:bg-[#E8F0EC] hover:text-[#3D5A4A] transition-colors'
            }
            onClick={() => setStatusFilter(s)}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-[#F5F0EB] rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarX size={40} className="mx-auto text-[#5B7B6A]/30 mb-3" />
              <p className="text-[#7A7267] text-sm">No appointments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-4 bg-[#FAF8F5] rounded-xl hover:bg-[#F5F0EB] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[#2D2D2D]">
                      {new Date(appt.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#7A7267] mt-0.5">
                      Patient: {appt.patientId.slice(0, 8)}... ·{' '}
                      {appt.durationMinutes} min
                    </p>
                    {appt.notes && (
                      <p className="text-xs text-[#5A5A5A] mt-1 italic">
                        &ldquo;{appt.notes}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}
                    >
                      {appt.status}
                    </span>
                    {appt.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(appt.id, 'confirmed')}
                        disabled={updateStatus.isPending}
                      >
                        Confirm
                      </Button>
                    )}
                    {appt.status === 'confirmed' && (
                      <>
                        <Link href={`/doctor/consultation/${appt.id}`}>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Join call
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdate(appt.id, 'completed')}
                          disabled={updateStatus.isPending}
                        >
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
