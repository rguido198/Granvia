import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentProfile } from "@/lib/auth/server";
import { fetchPortfolio } from "@/lib/data/portfolio.server";
import { categoryLabel, computeCategoryMix, computeExpirationTiers, matchTenantPillar } from "@/lib/data/rent-roll-report.server";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const portfolio = await fetchPortfolio();
  const tiers = computeExpirationTiers(portfolio.leases);
  const categoryMix = computeCategoryMix(portfolio.leases);

  const totalOccupiedCount = portfolio.rentRoll.filter((r) => !r.vacant).length;
  const totalVacantCount = portfolio.rentRoll.filter((r) => r.vacant).length;
  const occupancyPct = portfolio.plazaTotalGla > 0 ? (portfolio.leasedSqm / portfolio.plazaTotalGla) * 100 : 0;
  const digitizedCount = portfolio.leases.filter((l) => l.sourceDocumentId).length;

  // Sheet 1: Resumen Ejecutivo
  const summaryRows = [
    { Métrica: "Locales Totales", Valor: portfolio.rentRoll.length },
    { Métrica: "Locales Ocupados", Valor: totalOccupiedCount },
    { Métrica: "Locales Vacantes", Valor: totalVacantCount },
    { Métrica: "GLA Total (m²)", Valor: portfolio.plazaTotalGla },
    { Métrica: "GLA Arrendada (m²)", Valor: portfolio.leasedSqm },
    { Métrica: "Ocupación GLA (%)", Valor: `${occupancyPct.toFixed(1)}%` },
    { Métrica: "Renta Contratada Mensual (MXN)", Valor: portfolio.contractedRent },
    { Métrica: "Contratos Digitalizados", Valor: `${digitizedCount} de ${portfolio.leases.length}` },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

  // Sheet 2: Rent Roll Maestro
  const rentRollRows = portfolio.rentRoll.map((r) => {
    const lease = portfolio.leases.find((l) => l.unitCode === r.unitCode);
    const category = r.vacant ? "Vacante" : categoryLabel(lease ? matchTenantPillar(lease) : null);

    return {
      Local: r.unitCode,
      Inquilino: r.name,
      "Nombre Comercial": r.tradeName ?? "—",
      "Superficie (m²)": r.sqm,
      "Renta Mensual (MXN)": r.rent,
      "Participación GLA (%)": Number(r.sharePct.toFixed(2)),
      Estado: r.status,
      "Categoría / Giro": category,
    };
  });
  const rentRollSheet = XLSX.utils.json_to_sheet(rentRollRows);

  // Sheet 3: Vencimientos Próximos
  const expirationRows: Array<{
    "Rango Vencimiento": string;
    Local: string;
    Inquilino: string;
    "Nombre Comercial": string;
    "Fecha Vencimiento": string;
    "Días Restantes": number | string;
    "Renta Mensual (MXN)": number;
  }> = [];

  for (const tier of tiers) {
    for (const item of tier.leases) {
      expirationRows.push({
        "Rango Vencimiento": tier.label,
        Local: item.unitCode,
        Inquilino: item.tenantEntity,
        "Nombre Comercial": item.tradeName ?? "—",
        "Fecha Vencimiento": item.endDate,
        "Días Restantes": item.daysRemaining < 0 ? `Vencido (${Math.abs(item.daysRemaining)}d)` : item.daysRemaining,
        "Renta Mensual (MXN)": item.rentMonthly,
      });
    }
  }
  const expirationSheet = XLSX.utils.json_to_sheet(expirationRows);

  // Sheet 4: Mix de Categorías
  const categoryRows = categoryMix.map((item) => ({
    "Pilar / Categoría": item.label,
    "Conteo Locales": item.count,
    "Superficie GLA (m²)": item.sqmTotal,
    "% GLA Arrendada": Number(item.sqmPercentOfLeased.toFixed(2)),
  }));
  const categorySheet = XLSX.utils.json_to_sheet(categoryRows);

  // Build Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
  XLSX.utils.book_append_sheet(workbook, rentRollSheet, "Rent Roll");
  XLSX.utils.book_append_sheet(workbook, expirationSheet, "Vencimientos Próximos");
  XLSX.utils.book_append_sheet(workbook, categorySheet, "Mix de Categorías");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const dateStr = new Date().toISOString().slice(0, 7);
  const filename = `rent-roll-${dateStr}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
