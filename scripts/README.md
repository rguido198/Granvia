# scripts/ — generación del directorio

Estos scripts produjeron `src/content/tenants.ts` y `public/tenants/*` a partir
del directorio oficial en <https://lagranvia.com.mx/1330-2/>.

**No corren en build.** Son de un solo uso: vuelve a correrlos solo cuando el
directorio oficial cambie. Para correcciones puntuales, edita
`src/content/tenants.ts` directamente.

## Orden

```bash
cd scripts
curl -sL "https://lagranvia.com.mx/1330-2/" -o dir.html
python3 parse.py       # dir.html      -> tenants.json
python3 download.py    # descarga logos -> ../public/tenants
python3 retry.py       # reintenta los que el servidor bloquea por user-agent
python3 gen_tenants.py # -> ../src/content/tenants.ts
```

Requiere `Pillow` (`pip install Pillow`) para medir el contraste de cada
logotipo contra el fondo arena.

## Qué revisar después de regenerar

- `gen_tenants.py` imprime los locales cuyo giro fue **deducido**
  (`verify: true` en la salida) — confírmalos con administración.
- También imprime los logos que necesitan placa oscura (`logoOnDark`).
- El diccionario `CAT` mapea nombre → pilar + descriptor. Los nombres deben
  coincidir **exactamente** con los del sitio oficial, acentos incluidos
  (el sitio escribe "Sabrosisimo" sin acentos, por ejemplo).
