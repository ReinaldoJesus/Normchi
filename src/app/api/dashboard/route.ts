import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exigirSesion, manejarErrorApi } from "@/lib/apiAuth";
import { obtenerDashboard, type PeriodoDashboard } from "@/lib/dashboard";

const PERIODOS: PeriodoDashboard[] = ["hoy", "7d", "30d", "mes"];

export async function GET(request: NextRequest) {
  try {
    await exigirSesion();
    const periodoParam = new URL(request.url).searchParams.get("periodo");
    const periodo: PeriodoDashboard = PERIODOS.includes(periodoParam as PeriodoDashboard)
      ? (periodoParam as PeriodoDashboard)
      : "hoy";
    return NextResponse.json(await obtenerDashboard(periodo));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
