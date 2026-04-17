/* UI OVERHAUL: Parsley Health-inspired patient appointments page.
 * - Earthy status badges, warm cards, sage green accents */
'use client';

import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CalendarX } from 'lucide-react';
import Link from 'next/link';

type Appointment = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  doctorId: string;
  notes?: string;
};

/* UI OVERHAUL: Earthy status colors */
const statusColors: Record<string, string> = {
  pending: 'bg-[#FFF3E8] text-[#C4874A]',
  confirmed: 'bg-[#E8F0EC] text-[#5B7B6A]',
  completed: 'bg-[#E8EDF5] text-[#5A6B8A]',
  cancelled: 'bg-[#FDECEC] text-[#C4604A]',
};

export default function PatientAppointmentsPage() {
  const { data, isLoading } = useAppointments();
  const updateStatus = useUpdateAppointmentStatus();

  const appointments: Appointment[] = data?.data || [];

  const handleCancel = async (id: string) => {
    try {
      await updateStatus.mutateAsync({
        id,
        status: 'cancelled',
        cancellationReason: 'Patient request',
      });
      toast.success('Appointment cancelled');
    } catch {
      toast.error('Failed to cancel appointment');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          My Appointments
        </h1>
        <p className="text-[#7A7267] mt-1">
          All your past and upcoming appointments
        </p>
      </div>

      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[#2D2D2D] font-heading">
            Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <p className="text-[#7A7267] text-sm">No appointments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(appt.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {appt.durationMinutes} min
                      {appt.notes && ` · "${appt.notes}"`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}
                    >
                      {appt.status}
                    </span>
                    {appt.status === 'confirmed' && (
                      <Link href={`/patient/consultation/${appt.id}`}>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Join call
                        </Button>
                      </Link>
                    )}
                    {(appt.status === 'pending' ||
                      appt.status === 'confirmed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancel(appt.id)}
                        disabled={updateStatus.isPending}
                      >
                        Cancel
                      </Button>
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
