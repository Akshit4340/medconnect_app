'use client';

import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Appointment = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  doctorId: string;
  notes?: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
        <p className="text-slate-500 mt-1">
          All your past and upcoming appointments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : appointments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No appointments yet
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
                      {appt.durationMinutes} min
                      {appt.notes && ` · "${appt.notes}"`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}
                    >
                      {appt.status}
                    </span>
                    {appt.status === 'pending' ||
                    appt.status === 'confirmed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancel(appt.id)}
                        disabled={updateStatus.isPending}
                      >
                        Cancel
                      </Button>
                    ) : null}
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
