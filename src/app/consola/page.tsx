import type { Metadata } from "next";
import { PageFade } from "@/components/ui";
import { ConsoleShell } from "@/components/hub/console-shell";
import { buildConsoleData } from "@/lib/console-data.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";
import { fetchPendingLeaseApplications } from "@/lib/data/approval-queue.server";
import { fetchLocaleOptions, fetchTenantPortalData } from "@/lib/data/tenant-portal.server";
import { fetchContractors } from "@/lib/data/contractors.server";
import { fetchAutonomyState } from "@/lib/platform/settings.server";
import { fetchAuditLog } from "@/lib/platform/audit-log.server";
import { fetchCorporateUsers } from "@/lib/platform/users.server";
import { fetchActiveLeaseDocuments, fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchRenewalOutreachStatus, type RenewalOutreachStatus } from "@/lib/data/renewal-workspace.server";

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
// Was `runtime = "edge"` -- leftover from this app's Cloudflare Pages era
// (see git history: explicitly removed once for an RSC response mismatch,
// then re-added the same day for the Cloudflare migration, never cleaned up
// after the later move to Vercel). Nothing in this page's chain needs
// edge-specific APIs -- it's the same getSupabaseServiceClient() every
// other route uses, several of which (src/app/api/ingest/route.ts) already
// declare `runtime = "nodejs"` explicitly. Found live: a landlord uploading
// a lease saw router.refresh() and the 3s in-flight poll (both confirmed
// correct against live data) never actually update the rendered page --
// Edge Runtime on Vercel has documented RSC/revalidation consistency
// quirks force-dynamic doesn't fully route around. Node is a strict
// superset of what Edge can do, so this can't regress anything that
// worked before.

export const metadata: Metadata = {
  title: "Consola de Asset Management | La Gran Vía Mexicali",
  description: "Consola privada de control operativo, mantenimiento y expedientes de arrendamiento para La Gran Vía Mexicali.",
  robots: { index: false, follow: false },
};

export default async function ConsolaPage() {
  // Computed here, on the server, once per authenticated request. The result
  // travels to the browser on the RSC payload — which middleware gates — instead
  // of being compiled into a chunk that /_next/static/ serves to anyone.
  const data = buildConsoleData();

  // Diego's ticket queue is real Supabase data, not part of the illustrative
  // ConsoleData mock object — kept as a sibling fetch/prop rather than merged
  // into buildConsoleData() so the existing mock arrays stay untouched.
  const { tickets: diegoTickets, kpis: diegoKpis } = await fetchDiegoTickets();
  const localeOptions = await fetchLocaleOptions();
  const contractors = await fetchContractors();
  // "Vista Inquilino" inside the console previews the same real portal a
  // tenant would see — same data, same fetch, not a separate mock.
  const tenantPortal = await fetchTenantPortalData();
  const autonomyState = await fetchAutonomyState();
  const auditLog = await fetchAuditLog();
  const corporateUsers = await fetchCorporateUsers();
  const portfolio = await fetchPortfolio();
  // Legal tab's lease-digitization pipeline — intake state, not part of the
  // rent roll / lease ledger fetchPortfolio() returns.
  const activeLeaseDocuments = await fetchActiveLeaseDocuments();
  // Approval Inbox's one genuinely new source — see
  // approval-queue.server.ts's doc comment: no other fetch reaches pending
  // lease_applications rows.
  const leaseApplications = await fetchPendingLeaseApplications();
  // Contract Renewal Workspace's outreach log — Map isn't RSC-serializable
  // across the client boundary, so it travels down as a plain object.
  const renewalOutreachStatusMap = await fetchRenewalOutreachStatus(portfolio.leases.map((l) => l.leaseRowId));
  const renewalOutreachStatus: Record<string, RenewalOutreachStatus> = Object.fromEntries(renewalOutreachStatusMap);

  return (
    <PageFade>
      <ConsoleShell
        data={data}
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
      />
    </PageFade>
  );
}
