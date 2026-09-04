import type { Metadata } from "next";
import { PageFade } from "@/components/ui";
import { ConsoleShell } from "@/components/hub/console-shell";
import { buildConsoleData } from "@/lib/console-data.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";
import { fetchPendingLeaseApplications } from "@/lib/data/approval-queue.server";
import { fetchLocaleOptions, fetchTenantPortalData } from "@/lib/data/tenant-portal.server";
import { fetchContractors } from "@/lib/data/contractors.server";
import { fetchAutonomyState, fetchMaintenanceBudget, fetchApprovalTiers } from "@/lib/platform/settings.server";
import { fetchAuditLog } from "@/lib/platform/audit-log.server";
import { fetchCorporateUsers } from "@/lib/platform/users.server";
import { fetchActiveLeaseDocuments, fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchRenewalOutreachStatus, type RenewalOutreachStatus } from "@/lib/data/renewal-workspace.server";
import { fetchLeads } from "@/lib/data/leads.server";
import { fetchCapexCases, computeCapexKpis } from "@/lib/data/capex-cases.server";

/**
 * Landlord command center — plaza-wide rent roll, CAM prorateo and the agent
 * modules. Gated by the session check in src/middleware.ts; not linked from the
 * site navigation.
 *
 * Rendered per request, never prerendered.
 *
 * Left static, the build emits a consola.html containing the full rent roll as a
 * deployable asset sitting in the same bucket as the public pages. Middleware is
 * expected to gate it, but the safest version of that is for the artifact not to
 * exist: nothing on disk, nothing to serve by accident.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Consola de Asset Management | La Gran Vía Mexicali",
  description: "Consola privada de control operativo, mantenimiento y expedientes de arrendamiento para La Gran Vía Mexicali.",
  robots: { index: false, follow: false },
};

export default async function ConsolaPage() {
  const data = buildConsoleData();

  const { tickets: diegoTickets, kpis: diegoKpis } = await fetchDiegoTickets();
  const localeOptions = await fetchLocaleOptions();
  const contractors = await fetchContractors();
  const tenantPortal = await fetchTenantPortalData();
  const autonomyState = await fetchAutonomyState();
  const maintenanceBudget = await fetchMaintenanceBudget();
  const approvalTiers = await fetchApprovalTiers();
  const auditLog = await fetchAuditLog();
  const corporateUsers = await fetchCorporateUsers();
  const portfolio = await fetchPortfolio();
  const activeLeaseDocuments = await fetchActiveLeaseDocuments();
  const leaseApplications = await fetchPendingLeaseApplications();
  const renewalOutreachStatusMap = await fetchRenewalOutreachStatus(portfolio.leases.map((l) => l.leaseRowId));
  const renewalOutreachStatus: Record<string, RenewalOutreachStatus> = Object.fromEntries(renewalOutreachStatusMap);
  const leads = await fetchLeads();
  const capexCases = await fetchCapexCases();
  const capexKpis = computeCapexKpis(capexCases);

  return (
    <PageFade>
      <ConsoleShell
        data={data}
        capexCases={capexCases}
        capexKpis={capexKpis}
        maintenanceBudget={maintenanceBudget}
        approvalTiers={approvalTiers}
        diegoTickets={diegoTickets}
        diegoKpis={diegoKpis}
        localeOptions={localeOptions}
        contractors={contractors}
        tenantPortalLocale={tenantPortal.locale}
        tenantPortalTickets={tenantPortal.tickets}
        autonomyState={autonomyState}
        auditLog={auditLog}
        corporateUsers={corporateUsers}
        portfolio={portfolio}
        activeLeaseDocuments={activeLeaseDocuments}
        leaseApplications={leaseApplications}
        renewalOutreachStatus={renewalOutreachStatus}
        leads={leads}
      />
    </PageFade>
  );
}
