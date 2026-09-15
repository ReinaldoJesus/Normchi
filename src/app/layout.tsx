import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { obtenerSesion } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Normchi",
  description: "Costos, inventario y planificación para restaurantes",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const sesion = await obtenerSesion();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={200}>
          <AppShell sesion={sesion}>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
