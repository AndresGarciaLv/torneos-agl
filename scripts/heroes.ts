/**
 * Descarga el retrato oficial de cada héroe desde la wiki de Mobile Legends
 * (API de MediaWiki de Fandom, sin clave) y deja un manifiesto para la landing.
 *
 *     npm run heroes            # descarga lo que falte
 *     npm run heroes -- --force # vuelve a bajar todo
 *
 * Por qué el retrato y no el arte de skin: el retrato (`HeroNNN-portrait.png`,
 * 240×390) existe para TODOS los héroes con el mismo encuadre, así que la
 * galería sale pareja. El arte de skin es más grande pero su nombre de archivo
 * no sigue un patrón (tiene erratas en la propia wiki) y el encuadre cambia.
 *
 * Trampas conocidas:
 * - Las páginas de fandom.com devuelven 402 a clientes automáticos; `api.php` no.
 * - Fandom sirve WebP aunque la URL diga `.png`. La extensión se decide por los
 *   bytes, no por la URL: con la extensión equivocada algunos navegadores y
 *   next/image lo rechazan.
 *
 * Salida: public/heroes/<slug>.<ext> y src/content/heroes.json.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "heroes");
const MANIFEST = path.join(ROOT, "src", "content", "heroes.json");
const API = "https://mobile-legends.fandom.com/api.php";
const HEADERS = { "User-Agent": "monster-agl-torneo/1.0 (landing de un torneo de la comunidad)" };

/** Título en la wiki → rol que se muestra (en español, como en el cliente del juego). */
const HEROES: ReadonlyArray<{ title: string; name: string; role: string }> = [
  { title: "Natan", name: "Natan", role: "Tirador" },
  { title: "Yi Sun-shin", name: "Yi Sun-shin", role: "Asesino" },
  { title: "Eudora", name: "Eudora", role: "Mago" },
  { title: "Atlas", name: "Atlas", role: "Tanque" },
  { title: "Lukas", name: "Lukas", role: "Combatiente" },
  { title: "Ling", name: "Ling", role: "Asesino" },
  { title: "Fanny", name: "Fanny", role: "Asesino" },
  { title: "Gusion", name: "Gusion", role: "Asesino" },
  { title: "Chou", name: "Chou", role: "Combatiente" },
  { title: "Kagura", name: "Kagura", role: "Mago" },
  { title: "Layla", name: "Layla", role: "Tirador" },
  { title: "Miya", name: "Miya", role: "Tirador" },
  { title: "Tigreal", name: "Tigreal", role: "Tanque" },
  { title: "Lancelot", name: "Lancelot", role: "Asesino" },
  { title: "Granger", name: "Granger", role: "Tirador" },
  { title: "Esmeralda", name: "Esmeralda", role: "Mago" },
];

interface ManifestEntry {
  slug: string;
  name: string;
  role: string;
  src: string;
  width: number;
  height: number;
}

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-");

function sniffExtension(bytes: Uint8Array): "webp" | "png" | "jpg" {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  throw new Error("Formato de imagen desconocido.");
}

async function portraits(titles: string[]) {
  const params = new URLSearchParams({
    action: "query",
    prop: "pageimages",
    piprop: "original",
    titles: titles.join("|"),
    redirects: "1",
    format: "json",
  });
  const res = await fetch(`${API}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`La wiki respondió ${res.status}.`);
  const data = (await res.json()) as {
    query: {
      normalized?: { from: string; to: string }[];
      redirects?: { from: string; to: string }[];
      pages: Record<string, { title: string; original?: { source: string; width: number; height: number } }>;
    };
  };
  // La wiki primero normaliza el título ("Yi_Sun-shin" → "Yi Sun-shin") y después sigue redirecciones.
  const normalized = new Map((data.query.normalized ?? []).map((r) => [r.from, r.to]));
  const redirects = new Map((data.query.redirects ?? []).map((r) => [r.from, r.to]));
  const byTitle = new Map(Object.values(data.query.pages).map((p) => [p.title, p.original]));
  return (title: string) => {
    const clean = normalized.get(title) ?? title;
    return byTitle.get(redirects.get(clean) ?? clean);
  };
}

async function main() {
  const force = process.argv.includes("--force");
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(MANIFEST), { recursive: true });

  let previous: ManifestEntry[] = [];
  try {
    previous = JSON.parse(await readFile(MANIFEST, "utf8")) as ManifestEntry[];
  } catch {
    // Primera corrida.
  }

  const lookup = await portraits(HEROES.map((h) => h.title));
  const manifest: ManifestEntry[] = [];

  for (const hero of HEROES) {
    const slug = slugify(hero.name);
    const cached = previous.find((e) => e.slug === slug);
    if (cached && !force) {
      try {
        await readFile(path.join(ROOT, "public", cached.src));
        manifest.push({ ...cached, name: hero.name, role: hero.role });
        console.log(`· ${hero.name} (ya estaba)`);
        continue;
      } catch {
        // El manifiesto lo lista pero el archivo no está: se vuelve a bajar.
      }
    }

    const original = lookup(hero.title);
    if (!original) {
      console.warn(`✗ ${hero.name}: la wiki no tiene imagen principal.`);
      continue;
    }
    const res = await fetch(original.source, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`✗ ${hero.name}: ${res.status} al descargar.`);
      continue;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ext = sniffExtension(bytes);
    const file = `${slug}.${ext}`;
    await writeFile(path.join(OUT_DIR, file), bytes);
    manifest.push({ slug, name: hero.name, role: hero.role, src: `/heroes/${file}`, width: original.width, height: original.height });
    console.log(`✓ ${hero.name} → public/heroes/${file} (${original.width}×${original.height}, ${ext})`);
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n${manifest.length} de ${HEROES.length} héroes en src/content/heroes.json`);
  if (manifest.length < HEROES.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
