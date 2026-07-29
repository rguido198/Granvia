# La Gran Vía — sitio web

Sitio de marketing para La Gran Vía, plaza lifestyle en Mexicali, B.C.
Construido a partir del comp de concepto `Design requirements checklist.zip`
(ver `../extracted/La Gran Via Mexicali.dc.html`).

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 (configuración CSS-first en `src/app/globals.css`)
- `next/font` — Cormorant Garamond, Work Sans, IBM Plex Mono, auto-hospedadas

```bash
npm run dev
```

## Rutas

| Ruta                | Página            | Notas                                          |
| ------------------- | ----------------- | ---------------------------------------------- |
| `/`                 | Vive Un Gran Día  | Hero, pilares con locales reales, feed de Instagram |
| `/directorio`       | Directorio        | Los 85 locales: logo, zona, teléfono y horarios |
| `/crece-tu-negocio` | Leasing           | Formulario real + preview de la automatización  |
| `/eventos`          | Eventos & Carrera | Carrera 2026, Pasaporte Digital, JSON-LD        |
| `/inquilinos`       | Tenant Hub        | `noindex` — utilidad interna                    |

## Dónde vive el contenido

Todo el texto y los datos están en `src/content/`, separados de los
componentes. Para cargar la información real, edita solo estos archivos:

- `tenants.ts` — **generado**: los 85 locales reales (logo, pilar, zona,
  teléfono, horarios). Regenerar con el script en el scratchpad si el
  directorio oficial cambia; editar a mano es válido para correcciones puntuales.
- `instagram.ts` — handle, límite de la retícula y respaldo curado
- `site.ts` — nombre, dominio, correos, navegación, redes
- `home.ts` — hero y "Conoce lo nuevo"
- `leasing.ts` — giros, duraciones de arrendamiento, secuencias de seguimiento
- `events.ts` — fecha y datos de la Carrera, ofertas del pasaporte
- `hub.ts` — las tres acciones del Tenant Hub

Cada archivo lleva un comentario `TODO(contenido-real)` con lo que falta
confirmar. Búscalos con:

```bash
grep -rn "TODO(" src/
```

## Sistema de diseño

Los tokens (paleta, tipografía, radios, motion) están en el bloque `@theme`
de `src/app/globals.css`. Nombres clave: `sand-*` (superficies), `ink-*`
(texto), `terra` / `pine` / `gold` (acentos), `dune-*` (texto sobre fondo
oscuro), `hairline` (bordes).

## Instagram

La retícula de la portada consume la Instagram Graph API. Configura
`INSTAGRAM_ACCESS_TOKEN` (ver `.env.example`) y el feed aparece solo.

Sin token el sitio **no falla**: cae al respaldo curado de
`src/content/instagram.ts` y, si ese está vacío, muestra la tarjeta "Síguenos".
El feed revalida cada hora porque las URLs del CDN de Meta vienen firmadas y
caducan. El token de larga duración expira a los 60 días — hay que renovarlo.

## Estado de la integración

El formulario de leasing **sí funciona**: valida en el servidor y devuelve
errores por campo. Lo que aún no está conectado, por diseño:

- `recordLead()` en `src/lib/leads.ts` solo escribe un log estructurado.
  Antes de lanzar, apúntalo al CRM y dispara el auto-reply según la rama
  (guía PDF pop-up vs. enlace para agendar llamada).
- Los correos, el PDF y el pasaporte QR son maquetas visuales, tal como en
  el comp original — no son sistemas en producción.
- Las imágenes son placeholders de rayas diagonales. Cuando llegue la
  fotografía, reemplaza `ImagePlaceholder` por `next/image` y llena los
  campos `image` en `src/content/`.
- Las acciones del Tenant Hub apuntan a anclas `#`; falta conectarlas a los
  endpoints reales de tickets y reportes.
