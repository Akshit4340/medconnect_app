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

export function Navbar() {
  const { user, logout } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'MC';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="text-sm text-slate-500">
        Welcome back,{' '}
        <span className="font-medium text-slate-900">{user?.email}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-slate-900 text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-slate-900">{user?.email}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={logout}
            className="text-red-600 cursor-pointer"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
