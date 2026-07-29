"""Generate src/content/tenants.ts from the scraped official directory."""
import json, os, re, unicodedata
from PIL import Image

LOGO_DIR = "/Users/robertoguido/CascadeProjects/Gran Via/la-gran-via/public/tenants"
OUT = "/Users/robertoguido/CascadeProjects/Gran Via/la-gran-via/src/content/tenants.ts"

# pillar, short tag. Pillars mirror the comp's three "Arma tu plan" tabs, plus
# `servicios` for banks/professional services which the tabs don't surface.
CAT = {
    "260 Grill & Bar": ("prueba", "Grill & bar"),
    "Alma Verde": ("prueba", "Restaurante saludable"),
    "Asian Wok Box": ("prueba", "Comida asiática"),
    "Baja Brunch": ("prueba", "Brunch"),
    "Blue Luna Café": ("prueba", "Café & deli"),
    "Bodega 8": ("prueba", "Restaurante & bar"),
    "Bonaprime": ("prueba", "Steakhouse"),
    "Buffalo Wild Wings": ("prueba", "Alitas & deportes"),
    "Cabanna": ("prueba", "Restaurante"),
    "Devoralia": ("prueba", "Comedor urbano"),
    "Flavor Cup": ("prueba", "Postres & bebidas"),
    "French Place": ("prueba", "Tacos & cocina"),
    "Holy Cow": ("prueba", "Burger & beer joint"),
    "IHOP": ("prueba", "Desayunos"),
    "Koori": ("prueba", "Cocina japonesa"),
    "La Grieguita": ("prueba", "Gyros & cocina griega"),
    "Maraki Poke": ("prueba", "Poke to-go"),
    "Pagoda Cocina China": ("prueba", "Cocina china"),
    "Sabrosisimo": ("prueba", "Cocina casera"),
    "Subway": ("prueba", "Sándwiches"),
    "Távola Trattoría": ("prueba", "Trattoria italiana"),
    "The Cakery": ("prueba", "Pastelería"),
    "Thrifty Ice Cream": ("prueba", "Helados"),
    "Vinos Tras Lupita": ("prueba", "Vinos & bar"),
    "Wendlandt Tasting Room": ("prueba", "Cervecería artesanal"),
    "Wrap & Roll": ("prueba", "Wraps & saludable"),

    "Be a Lash Girl": ("consiente", "Extensiones de pestañas"),
    "Dentyx Clínica Dental": ("consiente", "Clínica dental"),
    "Derma Club Farmacia Dermatológica": ("consiente", "Farmacia dermatológica"),
    "Dra. Claudia H. Machuca": ("consiente", "Consultorio médico"),
    "Femgraphy": ("consiente", "Imagenología femenina"),
    "Grace Nails & Beauty": ("consiente", "Uñas & beauty"),
    "Karen Carrillo": ("consiente", "Medicina estética"),
    "Minué Studio": ("consiente", "Estudio de belleza"),
    "Nice Factory of Beauty": ("consiente", "Salón de belleza"),
    "Pily Camacho Salón Capilar": ("consiente", "Salón capilar"),
    "Rocio Beauty Treatment": ("consiente", "Tratamientos de belleza"),
    "Smilers": ("consiente", "Clínica dental"),
    "SYMMETRY GYM Mexicali": ("consiente", "Gimnasio"),
    "Timeless Medcenter": ("consiente", "Medicina estética"),
    "Zero Depilación": ("consiente", "Depilación láser"),
    "Zpin Lab": ("consiente", "Cycling & fitness"),

    "AmoreMe": ("visita", "Moda & accesorios"),
    "Ary Casa de Novias": ("visita", "Novias & fiesta"),
    "Ashley": ("visita", "Muebles & hogar"),
    "Best Optical": ("visita", "Óptica"),
    "Choys Moda Infantil": ("visita", "Moda infantil"),
    "Cinemex Premium": ("visita", "Cine premium"),
    "Etcétera Accesorios": ("visita", "Accesorios"),
    "Fairfield Inn & Suites by Marriott": ("visita", "Hospedaje"),
    "Holiday Inn Express": ("visita", "Hospedaje"),
    "Ixchel": ("visita", "Arte e identidad mexicana"),
    "Katana Manga Shop": ("visita", "Manga & coleccionables"),
    "KidSquad": ("visita", "Juegos infantiles"),
    "Lady Bug": ("visita", "Boutique infantil"),
    "Look Óptica": ("visita", "Óptica"),
    "Luuna": ("visita", "Colchones & descanso"),
    "Mae Boutique": ("visita", "Boutique"),
    "Maja": ("visita", "Ropa outdoor"),
    "Maktub": ("visita", "Boutique"),
    "Mi Corazón Hermoso": ("visita", "Regalos & detalles"),
    "MINT Boutique": ("visita", "Moda mujer"),
    "NOVAMODA": ("visita", "Boutique"),
    "Paloma's Interiors": ("visita", "Interiorismo"),
    "Pavi Italy": ("visita", "Calzado italiano"),
    "Perpetua Joyeros": ("visita", "Joyería"),
    "PETCO": ("visita", "Mascotas"),
    "Rosé": ("visita", "Boutique"),
    "Shoeblime": ("visita", "Calzado"),

    "ARA Transportes": ("servicios", "Logística & transporte"),
    "AT&T": ("servicios", "Telefonía"),
    "AXA": ("servicios", "Seguros"),
    "Banorte": ("servicios", "Banco"),
    "Banregio": ("servicios", "Banco"),
    "Hermez Diseño y Construcción": ("servicios", "Diseño & construcción"),
    "Masari Casa de Bolsa": ("servicios", "Casa de bolsa"),
    "Proaktiva": ("servicios", "Servicios empresariales"),
    "REMAX SH Deluxe": ("servicios", "Bienes raíces"),
    "Santander": ("servicios", "Banco"),
    "Symmetria Arquitectura": ("servicios", "Arquitectura"),
    "Telcel": ("servicios", "Telefonía"),
    "Uniformes Cisne": ("servicios", "Uniformes"),
    "Urban Clean": ("servicios", "Tintorería"),
    "Victor Rodiles": ("servicios", "Arquitectura"),
}


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()


# Cerrados permanentemente — se excluyen del directorio.
# Confirmado por administración el 2026-07-29.
CLOSED = {"Ardena"}

# Measured low-contrast against the sand card background; these get a dark tile.
DARK_TILE = {"Devoralia"}


def needs_dark(path):
    """True when the logo is light artwork on transparency (invisible on sand)."""
    if path.endswith(".svg"):
        return False
    im = Image.open(path).convert("RGBA")
    im.thumbnail((80, 80))
    px = [p for p in im.getdata() if p[3] > 40]
    if not px:
        return False
    opaque_ratio = len(px) / (im.width * im.height)
    lum = sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in px) / len(px)
    # Mostly-transparent AND bright artwork -> would disappear on a light card
    return opaque_ratio < 0.75 and lum > 170


NBSP = "\u00a0"
NNBSP = "\u202f"


def norm(s):
    """Clean a single line: unify spaces, dashes and quotes.

    Deliberately does NOT touch newlines — the directory uses them as the row
    separator between schedules, and collapsing them destroys the pairing.
    """
    s = s.replace(NBSP, " ").replace(NNBSP, " ").replace('"', "")
    s = s.replace("\u2013", "-").replace("\u2014", "-")   # en/em dash
    s = re.sub(r"\s*:\s*", ":", s)                       # "13 :00" -> "13:00"
    s = re.sub(r"\s*-\s*", " - ", s)
    return re.sub(r"[ \t]+", " ", s).strip()


DAY = r"(?:Lun|Mar|Mi[eé]rc?|Mier|Jue|Vier?|S[aá]b|Dom)(?:ingo)?\.?"
DAY_ONE = re.compile(DAY, re.I)
DAY_GROUP = re.compile(rf"{DAY}(?:\s*-\s*{DAY})?", re.I)
TIME_RANGE = re.compile(r"\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}")


def split_days(cell):
    """Split the days cell into one entry per schedule row."""
    lines = [norm(x) for x in cell.split("\n")]
    lines = [x for x in lines if x]
    if len(lines) <= 1:
        # Some rows use spaces instead of newlines: "Lun - Sáb  Domingo"
        one = lines[0] if lines else ""
        groups = [m.group(0) for m in DAY_GROUP.finditer(one)]
        if len(groups) > 1:
            return groups
        lines = lines or []
    # "LunMarMierJue" (source typo, no separators) -> "Lun, Mar, Mier, Jue"
    fixed = []
    for line in lines:
        if "-" not in line:
            toks = [m.group(0) for m in DAY_ONE.finditer(line)]
            if len(toks) > 1:
                fixed.append(", ".join(toks))
                continue
        fixed.append(line)
    return fixed


def split_times(cell):
    lines = [norm(x) for x in cell.split("\n")]
    lines = [x for x in lines if x]
    if len(lines) <= 1:
        one = lines[0] if lines else ""
        ranges = TIME_RANGE.findall(one)
        if len(ranges) > 1:
            return ranges
    return lines


def clean_hours(days, times):
    """Pair each day-group with its time range.

    Returns (schedule, needs_review). When the two columns disagree on how many
    rows they contain — which happens in the source for a handful of tenants —
    we do NOT guess a pairing. We keep the raw text and flag it, so a wrong
    schedule is never shown as if it were authoritative.
    """
    d_lines, t_lines = split_days(days), split_times(times)
    if not d_lines and not t_lines:
        return [], False
    if d_lines and len(d_lines) == len(t_lines):
        return [{"days": a, "times": b} for a, b in zip(d_lines, t_lines)], False
    return (
        [{"days": " ".join(d_lines), "times": " ".join(t_lines)}],
        True,
    )


rows = json.load(open("tenants_downloaded.json", encoding="utf-8"))
files = {f.rsplit(".", 1)[0]: f for f in os.listdir(LOGO_DIR)}

out, unknown, dark, closed_out, review = [], [], [], [], []
for r in rows:
    name = r["name"]
    if name in CLOSED:
        closed_out.append(name)
        continue
    sl = slug(name)
    fn = files.get(sl)
    if not fn:
        print("!! no file for", name)
        continue
    entry = CAT.get(name)
    if not entry:
        unknown.append(name)
        entry = ("visita", "Por confirmar", "?")
    pillar, tag = entry[0], entry[1]
    uncertain = len(entry) > 2
    if uncertain:
        unknown.append(name)
    hours, hours_review = clean_hours(r["c2"], r["c3"])
    if hours_review:
        review.append(name)
    nd = name in DARK_TILE or needs_dark(os.path.join(LOGO_DIR, fn))
    if nd:
        dark.append(name)
    out.append({
        "slug": sl, "name": name, "pillar": pillar, "tag": tag,
        "logo": f"/tenants/{fn}", "logoOnDark": nd,
        "zone": r["zone"], "phone": r["phone"].replace("\n", " · ").strip(),
        "hours": hours,
        "hoursNeedsReview": hours_review,
        "verify": uncertain,
    })

out.sort(key=lambda x: x["name"].lower())

def ts(v):
    return json.dumps(v, ensure_ascii=False)

lines = ['''/**
 * Directorio real de La Gran Vía — 85 locales.
 *
 * GENERADO desde el directorio oficial (lagranvia.com.mx/1330-2/).
 * Los logos viven en /public/tenants y provienen del mismo sitio oficial.
 *
 * `verify: true` marcaría un giro deducido del nombre o del logo. Hoy no hay
 * ninguno: los cuatro pendientes se confirmaron con administración el
 * 2026-07-29, y Ardena se excluyó por cierre definitivo.
 *
 * `hoursNeedsReview: true` marca los locales cuyo horario viene desalineado
 * en el directorio oficial (más grupos de días que rangos de horario). En esos
 * casos se muestra el texto crudo en vez de inventar un emparejamiento.
 * `logoOnDark: true` marca logotipos claros sobre fondo transparente: se
 * renderizan sobre una placa oscura porque desaparecerían sobre la arena.
 */

export type Pillar = "prueba" | "consiente" | "visita" | "servicios";

export type Tenant = {
  slug: string;
  name: string;
  pillar: Pillar;
  /** Descriptor corto mostrado bajo el nombre. */
  tag: string;
  logo: string;
  logoOnDark: boolean;
  zone: string;
  phone: string;
  hours: { days: string; times: string }[];
  /** El horario oficial viene desalineado en origen — revisar antes de publicar. */
  hoursNeedsReview?: boolean;
  /** Giro deducido — confirmar con administración. */
  verify?: boolean;
};

export const TENANTS: Tenant[] = [''']

for t in out:
    parts = [
        f'    slug: {ts(t["slug"])},',
        f'    name: {ts(t["name"])},',
        f'    pillar: {ts(t["pillar"])},',
        f'    tag: {ts(t["tag"])},',
        f'    logo: {ts(t["logo"])},',
        f'    logoOnDark: {"true" if t["logoOnDark"] else "false"},',
        f'    zone: {ts(t["zone"])},',
        f'    phone: {ts(t["phone"])},',
        f'    hours: {ts(t["hours"])},',
    ]
    if t["hoursNeedsReview"]:
        parts.append("    hoursNeedsReview: true,")
    if t["verify"]:
        parts.append("    verify: true,")
    lines.append("  {\n" + "\n".join(parts) + "\n  },")

lines.append("];")
lines.append('''
export const PILLAR_LABELS: Record<Pillar, { kicker: string; en: string; title: string; desc: string }> = {
  prueba: {
    kicker: "PRUEBA",
    en: "Taste",
    title: "Mesa & buena vida",
    desc: "Restaurantes, cafés y bares para cada antojo.",
  },
  consiente: {
    kicker: "CONSIÉNTETE",
    en: "Pamper",
    title: "Bienestar & belleza",
    desc: "Fitness, spa y estética para reconectar.",
  },
  visita: {
    kicker: "VISITA",
    en: "Explore",
    title: "Cultura & retail",
    desc: "Cine, hoteles y tiendas para explorar.",
  },
  servicios: {
    kicker: "RESUELVE",
    en: "Services",
    title: "Bancos & servicios",
    desc: "Banca, telefonía y servicios profesionales.",
  },
};

export const tenantsByPillar = (pillar: Pillar) =>
  TENANTS.filter((t) => t.pillar === pillar);
''')

open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")

print(f"wrote {len(out)} tenants -> {OUT}")
print(f"\nlogoOnDark ({len(dark)}):", ", ".join(dark))
print(f"\nneeds category confirmation ({len(set(unknown))}):", ", ".join(sorted(set(unknown))))
print(f"\nexcluded as closed ({len(closed_out)}):", ", ".join(closed_out))
print(f"\nhours need review ({len(review)}):", ", ".join(sorted(review)))
