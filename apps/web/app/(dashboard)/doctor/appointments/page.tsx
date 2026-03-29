'use client';

import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

type Appointment = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  patientId: string;
  notes?: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Appointments</h1>
        <p className="text-slate-500 mt-1">Manage your patient appointments</p>
      </div>

      <div className="flex gap-2">
        {['', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : appointments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No appointments found
            </p>
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
                      Patient: {appt.patientId.slice(0, 8)}... ·{' '}
                      {appt.durationMinutes} min
                    </p>
                    {appt.notes && (
                      <p className="text-xs text-slate-600 mt-1 italic">
                        "{appt.notes}"
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdate(appt.id, 'completed')}
                        disabled={updateStatus.isPending}
                      >
                        Complete
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
