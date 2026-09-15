"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  ChefHat,
  LayoutDashboard,
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
  { href: "/", label: "Panel", icon: LayoutDashboard },
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
        <Link href="/" className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            N
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
                const activo =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
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
            <SidebarMenuButton asChild isActive={pathname.startsWith("/configuracion")}>
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
