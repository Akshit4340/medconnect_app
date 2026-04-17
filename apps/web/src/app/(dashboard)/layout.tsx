/* UI OVERHAUL: Warm, spacious dashboard layout
 * with generous padding and cream background. */
import { Sidebar } from '../../components/layout/sidebar';
import { Navbar } from '../../components/layout/navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#FAF8F5]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        {/* UI OVERHAUL: Increased padding (p-8) for generous whitespace */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
