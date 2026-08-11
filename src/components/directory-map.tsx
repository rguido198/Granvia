"use client";

import { useState, useMemo } from "react";
import { TENANTS, type Pillar, PILLAR_LABELS } from "@/content/tenants";
import { TenantLogo } from "@/components/tenant-logo";
import { cn } from "@/components/ui";

/**
 * Definition of physical zones in La Gran Vía Mexicali
 */
const ZONES = [
  { id: "Zona 1", label: "Zona 1 · Acceso CETYS", category: "prueba", count: 8, x: 250, y: 90, w: 125, h: 120 },
  { id: "Zona 2", label: "Zona 2 · Restaurantes Central", category: "prueba", count: 11, x: 390, y: 90, w: 145, h: 120 },
  { id: "Zona 4", label: "Zona 4 · Fast Food & Bistro", category: "prueba", count: 9, x: 250, y: 230, w: 125, h: 140 },
  { id: "Zona 5", label: "Zona 5 · Servicios & Bancos", category: "servicios", count: 10, x: 390, y: 230, w: 145, h: 140 },
  { id: "Zona 6", label: "Zona 6 · Moda & Boutiques", category: "visita", count: 12, x: 550, y: 90, w: 130, h: 280 },
  { id: "Zona 7", label: "Zona 7 · Cine & Entretenimiento", category: "visita", count: 14, x: 700, y: 90, w: 260, h: 280 },
  { id: "Zona 8", label: "Zona 8 · Hotel & Negocios", category: "servicios", count: 6, x: 390, y: 390, w: 290, h: 100 },
  { id: "Zona 10", label: "Zona 10 · Lifestyle & Dining", category: "prueba", count: 15, x: 700, y: 390, w: 260, h: 100 },
];

/**
 * Key Anchors for Interactive Map Pins (Strict Collision-Free Coordinates)
 */
const MAP_ANCHORS = [
  { name: "Holy Cow", zone: "Zona 1", searchKey: "Holy Cow", x: 312, y: 175 },
  { name: "Távola", zone: "Zona 2", searchKey: "Távola", x: 462, y: 175 },
  { name: "Wok Box", zone: "Zona 4", searchKey: "Wok Box", x: 312, y: 325 },
  { name: "IHOP", zone: "Zona 5", searchKey: "IHOP", x: 410, y: 325 },
  { name: "AT&T", zone: "Zona 5", searchKey: "AT&T", x: 485, y: 325 },
  { name: "Wendlandt", zone: "Zona 6", searchKey: "Wendlandt", x: 615, y: 290 },
  { name: "Bodega 8", zone: "Zona 7", searchKey: "Bodega 8", x: 790, y: 220 },
  { name: "Alma Verde", zone: "Zona 7", searchKey: "Alma Verde", x: 885, y: 325 },
  { name: "Fairfield Hotel", zone: "Zona 8", searchKey: "Fairfield", x: 535, y: 465 },
  { name: "260 Grill", zone: "Zona 10", searchKey: "260 Grill", x: 770, y: 465 },
  { name: "Thrifty", zone: "Zona 10", searchKey: "Thrifty", x: 885, y: 465 },
];

export function DirectoryMap() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [activePillar, setActivePillar] = useState<Pillar | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<string | null>(null);

  // Filter tenants dynamically based on active filters
  const filteredTenants = useMemo(() => {
    return TENANTS.filter((t) => {
      // 1. Search Query Filter
      const matchesSearch =
        searchQuery === "" ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.zone.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Zone Filter (uses word boundary to prevent "Zona 1" matching "Zona 10")
      const matchesZone =
        selectedZone === null ||
        new RegExp(`\\b${selectedZone.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(t.zone);

      // 3. Pillar / Category Filter
      const matchesPillar =
        activePillar === "ALL" || t.pillar === activePillar;

      return matchesSearch && matchesZone && matchesPillar;
    });
  }, [searchQuery, selectedZone, activePillar]);

  // Handle map anchor pin click
  const handleAnchorClick = (anchor: (typeof MAP_ANCHORS)[number]) => {
    setSelectedAnchor(anchor.name);
    setSelectedZone(anchor.zone);
    setSearchQuery(anchor.searchKey);
  };

  // Reset all map filters
  const resetFilters = () => {
    setSelectedZone(null);
    setActivePillar("ALL");
    setSearchQuery("");
    setSelectedAnchor(null);
  };

  return (
    <div className="space-y-8">
      {/* MAP CONTROLS & FILTER BAR — 100% Achromatic Neutral Styling */}
      <div className="bg-sand-100 border border-hairline rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-2.5 text-ink-400 text-xs font-mono">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar local, restaurante o tienda en el mapa..."
              className="w-full bg-sand-50 border border-hairline-strong rounded-lg pl-9 pr-10 py-2 text-xs text-ink placeholder-ink-400 focus:outline-none focus:border-ink-700 focus:bg-white transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-ink-400 hover:text-ink text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Pillar Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActivePillar("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold border",
                activePillar === "ALL"
                  ? "bg-ink text-sand-100 border-ink shadow-xs"
                  : "bg-sand-50 text-ink border-hairline hover:border-ink-400"
              )}
            >
              Todos ({TENANTS.length})
            </button>
            {(["prueba", "consiente", "visita", "servicios"] as Pillar[]).map((p) => {
              const count = TENANTS.filter((t) => t.pillar === p).length;
              return (
                <button
                  key={p}
                  onClick={() => setActivePillar(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition-all cursor-pointer font-medium border",
                    activePillar === p
                      ? "bg-ink text-sand-100 border-ink shadow-xs"
                      : "bg-sand-50 text-ink border-hairline hover:border-ink-400"
                  )}
                >
                  {PILLAR_LABELS[p].kicker} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Filter Banner */}
        {(selectedZone || activePillar !== "ALL" || searchQuery) && (
          <div className="flex items-center justify-between bg-sand-200 border border-hairline-strong px-4 py-2.5 rounded-lg text-xs font-mono text-ink-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-ink">Filtro activo:</span>
              {selectedZone && (
                <span className="bg-ink text-sand-100 px-2 py-0.5 rounded text-[11px]">
                  {selectedZone}
                </span>
              )}
              {activePillar !== "ALL" && (
                <span className="bg-ink text-sand-100 px-2 py-0.5 rounded text-[11px]">
                  {PILLAR_LABELS[activePillar].kicker}
                </span>
              )}
              {searchQuery && (
                <span className="bg-ink text-sand-100 px-2 py-0.5 rounded text-[11px]">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
              <span className="text-ink-500">
                ({filteredTenants.length} {filteredTenants.length === 1 ? "local encontrado" : "locales encontrados"})
              </span>
            </div>
            <button
              onClick={resetFilters}
              className="text-ink-700 hover:text-ink underline font-bold cursor-pointer"
            >
              Limpiar filtros ✕
            </button>
          </div>
        )}
      </div>

      {/* BRAND ARCHITECTURAL VECTOR MAP CANVAS — Dune Palette (#211F1C) */}
      <div className="bg-[#211F1C] rounded-2xl border border-[#3D3830] p-4 sm:p-6 shadow-xl relative overflow-hidden text-sand-100">
        {/* Map Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#3D3830]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-sand-100 animate-pulse" />
              <span className="font-mono text-[10.5px] font-bold text-dune-300 uppercase tracking-widest">
                Plano Interactivo · La Gran Vía Mexicali
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-sand-100 tracking-tight">
              Mapa Arquitectónico de la Plaza
            </h2>
            <p className="text-xs text-dune-300 mt-0.5 font-sans">
              Haz clic en cualquier zona o local para filtrar el directorio en tiempo real.
            </p>
          </div>

          {/* Quick Zone Selector Buttons — All Zones */}
          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
            {ZONES.map((z) => (
              <button
                key={z.id}
                onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
                className={cn(
                  "px-2.5 py-1 rounded transition-all cursor-pointer border",
                  selectedZone === z.id
                    ? "bg-sand-100 text-ink font-bold border-sand-100"
                    : "bg-[#2C2A26] text-dune-200 border-[#3D3830] hover:border-dune-500"
                )}
              >
                {z.id}
              </button>
            ))}
          </div>
        </div>

        {/* SVG VECTOR CANVAS */}
        <div className="relative w-full overflow-hidden bg-[#1C1A18] rounded-xl border border-[#3A3631] p-2 sm:p-4">
          <svg
            viewBox="0 0 1000 520"
            className="w-full h-auto min-w-[650px] select-none"
            aria-label="Mapa interactivo de La Gran Vía Mexicali"
          >
            <defs>
              <pattern id="brand-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#2D2A26" strokeWidth="0.6" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="1000" height="520" fill="url(#brand-grid)" />

            {/* Calzada CETYS Main Boulevard Road Bar */}
            <path
              d="M 25 490 L 245 50"
              stroke="#3D3830"
              strokeWidth="44"
              strokeLinecap="round"
              fill="none"
            />
            <text
              x="95"
              y="340"
              transform="rotate(-64 95 340)"
              className="fill-dune-300 font-mono text-[9px] font-bold tracking-[0.18em]"
            >
              CALZADA CETYS · ACCESO
            </text>

            {/* PLAZA ZONES */}
            {ZONES.map((z) => {
              const isSelected = selectedZone === z.id;
              const isHovered = hoveredZone === z.id;
              const subLabel = z.label.split("·")[1]?.trim() || z.label;

              return (
                <g
                  key={z.id}
                  onClick={() => setSelectedZone(isSelected ? null : z.id)}
                  onMouseEnter={() => setHoveredZone(z.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  className="cursor-pointer transition-all"
                >
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx="8"
                    className={cn(
                      "transition-all stroke-2",
                      isSelected || isHovered
                        ? "fill-sand-100/20 stroke-sand-100"
                        : "fill-[#2C2A26] stroke-[#474138] hover:fill-[#36332E]"
                    )}
                  />

                  {/* Zone Header Title */}
                  <text
                    x={z.x + z.w / 2}
                    y={z.y + 22}
                    textAnchor="middle"
                    className="fill-sand-100 font-display font-semibold text-xs tracking-wide"
                  >
                    {z.id}
                  </text>

                  {/* Zone Subtitle */}
                  <text
                    x={z.x + z.w / 2}
                    y={z.y + 35}
                    textAnchor="middle"
                    className="fill-dune-300 font-mono text-[8.5px] uppercase tracking-wider"
                  >
                    {subLabel}
                  </text>
                </g>
              );
            })}

            {/* MAP ANCHOR PINS */}
            {MAP_ANCHORS.map((a) => {
              const isSelected = selectedAnchor === a.name;
              const badgeWidth = a.name.length * 7 + 18;

              return (
                <g
                  key={a.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnchorClick(a);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Pin Dot */}
                  <circle
                    cx={a.x}
                    cy={a.y}
                    r="5.5"
                    className={cn(
                      "transition-all stroke-2 stroke-[#211F1C]",
                      isSelected ? "fill-sand-100 scale-125" : "fill-sand-100 group-hover:fill-white"
                    )}
                  />

                  {/* Badge Label Rectangle */}
                  <rect
                    x={a.x - badgeWidth / 2}
                    y={a.y - 24}
                    width={badgeWidth}
                    height="16"
                    rx="4"
                    className={cn(
                      "transition-all stroke-1",
                      isSelected
                        ? "fill-[#3D3830] stroke-sand-100"
                        : "fill-[#131112]/95 stroke-[#474138] group-hover:stroke-sand-100"
                    )}
                  />

                  {/* Badge Text Label */}
                  <text
                    x={a.x}
                    y={a.y - 13}
                    textAnchor="middle"
                    className={cn(
                      "font-mono text-[8.5px] font-bold transition-colors",
                      isSelected ? "fill-white" : "fill-sand-200 group-hover:fill-white"
                    )}
                  >
                    {a.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Zone Info Footer */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono pt-3 border-t border-[#3D3830] text-dune-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sand-100" />
              <span>Haz clic en una zona del mapa para filtrar los 85 locales</span>
            </div>
            <span className="text-sand-100 font-bold">La Gran Vía Mexicali</span>
          </div>
        </div>
      </div>

      {/* FILTERED TENANTS DIRECTORY GRID — 100% Achromatic Neutral Typography */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <h3 className="font-display text-xl font-semibold text-ink">
            Locales en La Gran Vía ({filteredTenants.length})
          </h3>
          <span className="text-xs font-mono text-ink-400">
            Mostrando {filteredTenants.length} de {TENANTS.length} locales
          </span>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map((tenant) => (
            <li
              key={tenant.slug}
              className="flex gap-4 rounded-xl border border-hairline bg-sand-100 p-4 transition-all hover:border-ink-400 hover:shadow-xs group"
            >
              <TenantLogo tenant={tenant} className="h-20 w-24 flex-none object-contain rounded-lg border border-hairline bg-white p-1" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-lg font-semibold text-ink leading-tight group-hover:text-black">
                    {tenant.name}
                  </h4>
                  <span className="bg-sand-200 text-ink-700 text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 border border-hairline">
                    {tenant.zone}
                  </span>
                </div>

                <p className="font-mono text-[10.5px] text-ink-400 uppercase tracking-wider">
                  {tenant.tag}
                </p>

                {tenant.phone && (
                  <p className="text-xs font-mono text-ink-700">
                    <a href={`tel:${tenant.phone.replace(/[^\d+]/g, "")}`} className="text-ink-700 hover:text-ink hover:underline">
                      {tenant.phone}
                    </a>
                  </p>
                )}

                {tenant.hours.length > 0 && (
                  <p className="text-[11.5px] text-ink-500 font-mono truncate">
                    {tenant.hours[0].days}: {tenant.hours[0].times}
                  </p>
                )}

                <button
                  onClick={() => {
                    const zoneKey = tenant.zone.split(" ")[0] + " " + tenant.zone.split(" ")[1];
                    setSelectedZone(zoneKey);
                    setSearchQuery(tenant.name);
                    window.scrollTo({ top: 180, behavior: "smooth" });
                  }}
                  className="mt-2 text-[11px] font-mono font-bold text-ink-700 hover:text-ink underline cursor-pointer inline-block"
                >
                  Ver en mapa →
                </button>
              </div>
            </li>
          ))}
        </ul>

        {filteredTenants.length === 0 && (
          <div className="text-center py-12 bg-sand-50 rounded-xl border border-hairline p-8 space-y-3 font-mono">
            <p className="text-sm font-bold text-ink">No se encontraron locales con los filtros seleccionados.</p>
            <button
              onClick={resetFilters}
              className="bg-ink text-sand-100 px-4 py-2 rounded-md text-xs font-bold cursor-pointer hover:bg-ink-700"
            >
              Restablecer todos los filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
