"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  ChefHat,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavUsuario } from "@/components/nav-usuario";
import type { SesionUsuario } from "@/lib/sesion";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/insumos", label: "Insumos", icon: Package },
  { href: "/recetas", label: "Recetas", icon: ChefHat },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/ventas", label: "Ventas", icon: Receipt },
  { href: "/inventario", label: "Inventario", icon: Warehouse },
  { href: "/planificacion", label: "Planificación", icon: CalendarClock },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
] as const;

export function AppSidebar({ sesion }: { sesion: SesionUsuario | null }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(245,158,11,0.5)]">
            <Image
              src="/logo-mark.png"
              alt="Normchi"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/45 to-transparent" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Normchi
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const activo = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={activo}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-1 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm" isActive={pathname === "/"}>
              <Link href="/">
                <LayoutGrid />
                <span>Panel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm" isActive={pathname.startsWith("/configuracion")}>
              <Link href="/configuracion">
                <Settings />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {sesion ? (
          <>
            <SidebarSeparator className="my-2" />
            <NavUsuario sesion={sesion} />
          </>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
