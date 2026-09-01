import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type EquipmentAssetCategory =
  | "ALL"
  | "HVAC"
  | "ELEVATOR"
  | "POWER"
  | "ROOF"
  | "FIRE"
  | "SOLAR"
  | "SECURITY"
  | "PLANT"
  | "GENERAL";

export type EquipmentAsset = {
  id: string;
  localeId: string;
  unitNumber: string;
  name: string;
  category: EquipmentAssetCategory;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  installDate: string | null;
  warrantyExpiry: string | null;
  serviceContractProvider: string | null;
  coverageSummary: string | null;
  docName: string;
  sourceDocumentId: string | null;
  statusBadge: string;
  subtext: string | null;
  createdAt: string;
};

type ManualUrlPayload = {
  name?: string;
  category?: EquipmentAssetCategory;
  docName?: string;
  serialNumber?: string;
  coverage?: string;
  sourceDocumentId?: string;
  statusBadge?: string;
  subtext?: string;
};

const INITIAL_PLAZA_ASSETS = [
  {
    name: "Chiller Centravac Trane 150 Ton (Torre Central)",
    category: "HVAC" as EquipmentAssetCategory,
    make: "Trane",
    model: "Centravac 150 Ton",
    serialNumber: "Serie: TRN-2024-884",
    installDate: "2024-11-14",
    warrantyExpiry: "2029-11-14",
    serviceContractProvider: "Climas de Mexicali S.A. de C.V.",
    coverageSummary: "5 Años en Compresor, Condensador & Evaporador",
    docName: "garantia_trane_chiller_2024_2029.pdf",
    statusBadge: "Garantía Activa ✓",
    subtext: "Revisión Preventiva: Al Día",
  },
  {
    name: "Elevador Panorámico ThyssenKrupp (Zona A)",
    category: "ELEVATOR" as EquipmentAssetCategory,
    make: "ThyssenKrupp",
    model: "Panorámico Zona A",
    serialNumber: "Serie: TK-MEX-4410",
    installDate: "2024-01-01",
    warrantyExpiry: "2026-12-31",
    serviceContractProvider: "TK Elevator México",
    coverageSummary: "Atención de Urgencia 24/7 & Repuestos Originales",
    docName: "poliza_mantenimiento_thyssenkrupp_2026.pdf",
    statusBadge: "Garantía Activa ✓",
    subtext: "Último Mantenimiento: 25 Jul",
  },
  {
    name: "Subestación Eléctrica Schneider 1500 KVA",
    category: "POWER" as EquipmentAssetCategory,
    make: "Schneider Electric",
    model: "Subestación 1500 KVA",
    serialNumber: "Serie: SCH-1500-KVA",
    installDate: "2023-02-28",
    warrantyExpiry: "2028-02-28",
    serviceContractProvider: "Schneider Electric México",
    coverageSummary: "Transformadores de Potencia & Interruptores de Vacío",
    docName: "garantia_subestacion_schneider_2025.pdf",
    statusBadge: "Garantía Activa ✓",
    subtext: "Carga Actual: 68% Capacity",
  },
  {
    name: "Impermeabilización Mapei (Cinemex & Zona B)",
    category: "ROOF" as EquipmentAssetCategory,
    make: "Mapei",
    model: "Sistema Membrana 10A",
    serialNumber: "Superficie: 8,400 m²",
    installDate: "2024-06-15",
    warrantyExpiry: "2034-06-15",
    serviceContractProvider: "Mapei de México",
    coverageSummary: "Garantía de 10 Años Libre de Filtraciones en Techos",
    docName: "garantia_impermeabilizacion_mapei_10a.pdf",
    statusBadge: "Garantía 10 Años ✓",
    subtext: "Estado: 0 Filtraciones",
  },
  {
    name: "Sistema de Aspersión & Bomba SimplexGrinnell",
    category: "FIRE" as EquipmentAssetCategory,
    make: "SimplexGrinnell",
    model: "Bomba Principal NFPA 25",
    serialNumber: "Certificación: NFPA 25",
    installDate: "2024-09-30",
    warrantyExpiry: "2027-09-30",
    serviceContractProvider: "Johnson Controls Fire Protection",
    coverageSummary: "Certificación NFPA 25 & Reemplazo de Válvulas de Retención",
    docName: "poliza_sistema_contra_incendio_2026.pdf",
    statusBadge: "Garantía Activa ✓",
    subtext: "Presión: 140 PSI (OK)",
  },
  {
    name: "Arreglo Fotovoltaico Canadian Solar (Techado C)",
    category: "SOLAR" as EquipmentAssetCategory,
    make: "Canadian Solar",
    model: "Panel 350 kWp High Efficiency",
    serialNumber: "Capacidad: 350 kWp",
    installDate: "2023-01-10",
    warrantyExpiry: "2048-01-10",
    serviceContractProvider: "Canadian Solar México / Enel X",
    coverageSummary: "25 Años de Rendimiento Fotovoltaico al 85% de Eficiencia",
    docName: "garantia_paneles_solares_canadian_25a.pdf",
    statusBadge: "Garantía 25 Años ✓",
    subtext: "Generación: 42 MWh/mes",
  },
  {
    name: "Barreras Automatizadas & Cámaras FAAC / Hikvision",
    category: "SECURITY" as EquipmentAssetCategory,
    make: "FAAC / Hikvision",
    model: "LPR 6 Carriles Control de Acceso",
    serialNumber: "6 Carriles LPR",
    installDate: "2024-05-18",
    warrantyExpiry: "2027-05-18",
    serviceContractProvider: "Hikvision & FAAC México",
    coverageSummary: "Motores Hidráulicos FAAC & Cámaras de Reconocimiento LPR",
    docName: "poliza_barreras_estacionamiento_faac.pdf",
    statusBadge: "Garantía Activa ✓",
    subtext: "Uptime: 99.9%",
  },
  {
    name: "Planta de Tratamiento & Bombas Grundfos",
    category: "PLANT" as EquipmentAssetCategory,
    make: "Grundfos",
    model: "PTAR 50 m³/día",
    serialNumber: "PTAR 50 m³/día",
    installDate: "2024-11-05",
    warrantyExpiry: "2027-11-05",
    serviceContractProvider: "Grundfos México",
    coverageSummary: "Bombas Sumergibles, Membranas Biológicas & Control SBR",
    docName: "garantia_planta_tratamiento_grundfos.pdf",
    statusBadge: "Garantía Activa ✓",
    subtext: "Reutilización: 100% Riego",
  },
];

export async function fetchEquipmentAssets(): Promise<EquipmentAsset[]> {
  const supabase = getSupabaseServiceClient();

  const { data: locales } = await supabase.from("locales").select("id, unit_number").limit(50);
  const defaultLocaleId = locales?.[0]?.id ?? "00000000-0000-0000-0000-000000000000";
  const localeMap = new Map((locales ?? []).map((l) => [l.id, l.unit_number]));

  const { data: rows, error } = await supabase
    .from("assets")
    .select("id, locale_id, make, model, install_date, warranty_expiry, service_contract_provider, manual_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assets from Supabase:", error.message);
    return [];
  }

  // Auto-seed initial plaza assets if table is empty
  if (!rows || rows.length === 0) {
    const toInsert = INITIAL_PLAZA_ASSETS.map((asset) => ({
      locale_id: defaultLocaleId,
      make: asset.make,
      model: `${asset.name} (${asset.model})`,
      install_date: asset.installDate,
      warranty_expiry: asset.warrantyExpiry,
      service_contract_provider: asset.serviceContractProvider,
      manual_url: JSON.stringify({
        name: asset.name,
        category: asset.category,
        serialNumber: asset.serialNumber,
        coverage: asset.coverageSummary,
        docName: asset.docName,
        statusBadge: asset.statusBadge,
        subtext: asset.subtext,
      }),
    }));

    const { data: seededRows, error: seedErr } = await supabase.from("assets").insert(toInsert).select();
    if (seedErr) {
      console.error("Failed to seed initial plaza assets:", seedErr.message);
      return [];
    }
    return (seededRows ?? []).map((r) => parseAssetRow(r, localeMap));
  }

  return rows.map((r) => parseAssetRow(r, localeMap));
}

function parseAssetRow(
  r: {
    id: string;
    locale_id: string;
    make: string | null;
    model: string | null;
    install_date: string | null;
    warranty_expiry: string | null;
    service_contract_provider: string | null;
    manual_url: string | null;
    created_at: string;
  },
  localeMap: Map<string, string>,
): EquipmentAsset {
  let meta: ManualUrlPayload = {};
  if (r.manual_url) {
    try {
      meta = JSON.parse(r.manual_url);
    } catch {
      meta = { docName: r.manual_url };
    }
  }

  const category: EquipmentAssetCategory = meta.category || "GENERAL";
  const unitNumber = localeMap.get(r.locale_id) || "Área Común";

  return {
    id: r.id,
    localeId: r.locale_id,
    unitNumber,
    name: meta.name || r.model || r.make || "Equipo de Infraestructura",
    category,
    make: r.make,
    model: r.model,
    serialNumber: meta.serialNumber || (r.make ? `Marca: ${r.make}` : null),
    installDate: r.install_date,
    warrantyExpiry: r.warranty_expiry,
    serviceContractProvider: r.service_contract_provider,
    coverageSummary: meta.coverage || "Cobertura Estándar de Mantenimiento",
    docName: meta.docName || "garantia_documento.pdf",
    sourceDocumentId: meta.sourceDocumentId || null,
    statusBadge: meta.statusBadge || (r.warranty_expiry && r.warranty_expiry > new Date().toISOString().slice(0, 10) ? "Garantía Activa ✓" : "Garantía Registrada"),
    subtext: meta.subtext || null,
    createdAt: r.created_at,
  };
}
