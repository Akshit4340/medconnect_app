/* UI OVERHAUL: Parsley Health-inspired auth layout.
 * - Warm cream-to-sage gradient background
 * - Serif brand name with decorative leaf accent
 * - Soft, inviting presentation for authentication pages */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF8F5] via-[#F5F0EB] to-[#E8F0EC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background shapes for visual depth */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#5B7B6A]/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#D4A574]/5 rounded-full translate-y-1/3 -translate-x-1/4" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          {/* Decorative leaf accent */}
          <div className="flex justify-center mb-3">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5B7B6A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 8c.7-1 1.2-2.2 1.6-3.6.4-1.5.4-3.1 0-4.4-1.3-.4-2.9-.4-4.4 0C12.8 .4 11.6.9 10.6 1.6 8 4.3 6.5 8.2 7 12c-1.4 1.4-2.5 3.2-3 5.2A13 13 0 0 0 16 5" />
              <path d="M2 22c2-4 5.5-7.5 10-9" />
            </svg>
          </div>
          {/* Serif brand name for trust/authority */}
          <h1 className="text-3xl font-semibold text-[#2D2D2D] font-heading">
            MedConnect
          </h1>
          <p className="text-[#7A7267] mt-1.5 text-sm tracking-wide">
            Modern Telemedicine, Timeless Care
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
