'use client';

import { useAdminStats } from '../../../hooks/use-admin';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';

interface AdminStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats() as {
    data: AdminStats | undefined;
    isLoading: boolean;
  };

  const statCards = [
    { label: 'Total users', value: stats?.totalUsers ?? 0, icon: '👥' },
    { label: 'Doctors', value: stats?.totalDoctors ?? 0, icon: '🩺' },
    { label: 'Patients', value: stats?.totalPatients ?? 0, icon: '🤒' },
    { label: 'Appointments', value: stats?.totalAppointments ?? 0, icon: '📅' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Tenant overview</p>
      </div>

      {statsLoading ? (
        <p className="text-slate-500">Loading stats...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <span>{card.icon}</span>
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {stats?.appointmentsByStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Appointments by status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.appointmentsByStatus).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className="bg-slate-50 rounded-lg p-4 text-center"
                      >
                        <p className="text-2xl font-bold text-slate-900">
                          {count as number}
                        </p>
                        <p className="text-sm text-slate-500 capitalize mt-1">
                          {status}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
