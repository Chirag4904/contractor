"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  LayoutDashboard,
  MapPin,
  Users,
  CalendarCheck,
  Wallet,
  Package,
  Landmark,
  BookOpen,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  CreditCard,
  HandCoins,
  Banknote,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, adminOnly: true },
  { label: "Sites", href: "/sites", icon: MapPin, adminOnly: true },
  { label: "Labour", href: "/labour", icon: Users },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Advances", href: "/advances", icon: HandCoins, adminOnly: true },
  { label: "Expenses", href: "/expenses", icon: Wallet, adminOnly: true },
  // { label: "Materials", href: "/materials", icon: Package, adminOnly: true },
];

const adminNavItems: NavItem[] = [
  { label: "Settlements", href: "/settlements", icon: Banknote, adminOnly: true },
  { label: "Labour Payments", href: "/payments", icon: CreditCard, adminOnly: true },
  { label: "Bank Payments", href: "/bank-payments", icon: Landmark, adminOnly: true },
  { label: "Ledger", href: "/ledger", icon: BookOpen, adminOnly: true },
];

const bottomNavItems: NavItem[] = [
  // { label: "Reports", href: "/reports", icon: BarChart3, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin } = useUser();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">HISAAB</span>
        </Link>
      </div>

      <Separator />

      {/* Main Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClick={onNavigate}
            />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </span>
            </div>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onClick={onNavigate}
              />
            ))}
          </>
        )}

        <Separator className="my-3" />

        {bottomNavItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClick={onNavigate}
            />
        ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile?.role || "user"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-bold">HISAAB</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
