/* UI OVERHAUL: Parsley Health-inspired navbar.
 * - Warm white background with subtle warm border
 * - Sage green avatar accent
 * - Clean charcoal typography */
'use client';

import { useAuth } from '../../contexts/auth.context';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'MC';

  return (
    <header className="h-16 bg-white border-b border-[#E8E2DA] flex items-center justify-between px-8">
      <div className="text-sm text-[#7A7267]">
        Welcome back,{' '}
        <span className="font-medium text-[#2D2D2D]">{user?.email}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full hover:bg-[#E8F0EC] transition-colors"
          >
            {/* UI OVERHAUL: Sage green avatar with white text */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-[#5B7B6A] text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 rounded-xl shadow-lg border-[#E8E2DA]"
        >
          <div className="px-3 py-3">
            <p className="text-sm font-medium text-[#2D2D2D]">{user?.email}</p>
            <p className="text-xs text-[#7A7267] capitalize mt-0.5">
              {user?.role}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-[#E8E2DA]" />
          <DropdownMenuItem
            onClick={logout}
            className="text-[#C4604A] cursor-pointer flex items-center gap-2 rounded-lg mx-1 mb-1"
          >
            <LogOut size={14} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
