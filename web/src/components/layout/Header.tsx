import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Menu } from "lucide-react";

export default function SiteHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-7xl flex items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-200 font-bold">LM</div>
          <span className="font-semibold">Live Monitoring</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/login" className={({isActive}) => isActive ? "font-medium" : "text-slate-600 hover:text-slate-900"}>Login</NavLink>
          <NavLink to="/app" className="text-slate-600 hover:text-slate-900">App</NavLink>
          <NavLink to="/app/reports" className="text-slate-600 hover:text-slate-900">Reports</NavLink>
          <NavLink to="/app/settings" className="text-slate-600 hover:text-slate-900">Settings</NavLink>
          <Separator orientation="vertical" className="h-5" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Avatar className="h-6 w-6"><AvatarFallback>U</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/login">Sign in</Link></DropdownMenuItem>
              {/* Later: Profile, Sign out, etc. */}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-6 grid gap-4">
                <NavLink to="/login" className="text-slate-700">Login</NavLink>
                <NavLink to="/app" className="text-slate-700">App</NavLink>
                <NavLink to="/app/reports" className="text-slate-700">Reports</NavLink>
                <NavLink to="/app/settings" className="text-slate-700">Settings</NavLink>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}