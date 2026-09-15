"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cerrarSesionAction } from "@/lib/auth-actions";
import { ETIQUETAS_ROL, type RolUsuario } from "@/lib/validaciones/usuario";
import type { SesionUsuario } from "@/lib/sesion";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return (partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "");
}

export function NavUsuario({ sesion }: { sesion: SesionUsuario }) {
  const [saliendo, startTransition] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs uppercase">
                  {iniciales(sesion.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{sesion.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">{sesion.email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
              {ETIQUETAS_ROL[sesion.rol as RolUsuario]}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={saliendo}
              onSelect={() => startTransition(() => cerrarSesionAction())}
            >
              <LogOut />
              {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
