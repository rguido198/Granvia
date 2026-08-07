import type { Metadata } from "next";
import { PageFade } from "@/components/ui";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";

export const metadata: Metadata = {
  title: "Executive Asset Management Dashboard | La Gran Vía Mexicali",
  description:
    "Consola privada de control operativo, CAM NNN prorrateo y auditoría de exclusividades para La Gran Vía Mexicali.",
  robots: { index: false, follow: false },
};

export default function TenantHubPage() {
  return (
    <PageFade>
      <LandlordDashboard />
    </PageFade>
  );
}
