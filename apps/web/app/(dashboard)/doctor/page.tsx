'use client';

import { useAuth } from '../../../contexts/auth.context';
import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '../../../hooks/use-appointments';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

type Appointment = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  notes?: string;
  patientId: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useAppointments({ status: 'pending' });
  const updateStatus = useUpdateAppointmentStatus();

  const appointments: Appointment[] = data?.data || [];

  const handleConfirm = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'confirmed' });
      toast.success('Appointment confirmed');
    } catch {
      toast.error('Failed to confirm appointment');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'completed' });
      toast.success('Appointment marked complete');
    } catch {
      toast.error('Failed to update appointment');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
        <p className="text-slate-500 mt-1">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {appointments.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              My schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/doctor/schedule">
              <Button variant="outline" size="sm" className="w-full">
                Manage availability
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              All appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/doctor/appointments">
              <Button variant="outline" size="sm" className="w-full">
                View all
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending appointment requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : appointments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No pending requests
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
                      Patient: {appt.patientId.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(appt.scheduledAt).toLocaleString()} ·{' '}
                      {appt.durationMinutes} min
                    </p>
                    {appt.notes && (
                      <p className="text-xs text-slate-600 mt-1 italic">
                        "{appt.notes}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(appt.id)}
                      disabled={updateStatus.isPending}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleComplete(appt.id)}
                      disabled={updateStatus.isPending}
                    >
                      Complete
                    </Button>
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
