import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(demoRoot, 'public');
const siteUrl = (process.env.SITE_URL || 'https://zirel.org').replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);

const excludedPaths = new Set([
  '/login',
  '/register',
]);

function pathToUrlPath(relativePath) {
  const normalized = relativePath.replaceAll(path.sep, '/');

  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  return `/${normalized.replace(/\.html$/, '')}`;
}

function getSeoMeta(urlPath) {
  if (urlPath === '/') return { changefreq: 'weekly', priority: '1.0' };
  if (['/restaurant', '/hotel', '/professional'].includes(urlPath)) {
    return { changefreq: 'weekly', priority: '0.9' };
  }
  if (urlPath === '/guide/') return { changefreq: 'weekly', priority: '0.8' };
  if (urlPath.startsWith('/guide/')) return { changefreq: 'monthly', priority: '0.75' };
  if (['/pricing', '/contatti'].includes(urlPath)) return { changefreq: 'monthly', priority: '0.7' };
  if (['/pricing-restaurant', '/pricing-hotel', '/pricing-professional', '/faq'].includes(urlPath)) {
    return { changefreq: 'monthly', priority: '0.65' };
  }
  if (['/demo', '/hotel-demo', '/professional-demo'].includes(urlPath)) {
    return { changefreq: 'monthly', priority: '0.6' };
  }
  if (['/privacy', '/cookie'].includes(urlPath)) return { changefreq: 'yearly', priority: '0.3' };
  return { changefreq: 'monthly', priority: '0.5' };
}

async function collectHtmlFiles(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const entryBase = path.join(base, entry.name);
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(fullPath, entryBase));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(entryBase);
    }
  }

  return files;
}

async function generateSitemap() {
  const htmlFiles = await collectHtmlFiles(demoRoot);
  const urlPaths = htmlFiles
    .map(pathToUrlPath)
    .filter((urlPath) => !excludedPaths.has(urlPath))
    .sort((a, b) => a.localeCompare(b, 'it'));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlPaths.map((urlPath) => {
      const { changefreq, priority } = getSeoMeta(urlPath);
      return [
        '  <url>',
        `    <loc>${siteUrl}${urlPath}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    }),
    '</urlset>',
    '',
  ].join('\n');

  await writeFile(path.join(publicDir, 'sitemap.xml'), xml, 'utf8');
}

async function generateRobots() {
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');

  await writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');
}

async function validateCanonicalTargets() {
  const files = [
    'index.html',
    'restaurant.html',
    'hotel.html',
    'professional.html',
    'faq.html',
    'guide/index.html',
    'guide/ai-per-ristoranti.html',
    'guide/come-aumentare-prenotazioni-ristorante.html',
    'guide/automazione-richieste-hotel.html',
    'guide/whatsapp-hotel-prenotazioni.html',
    'guide/gestione-primo-contatto-studi-professionali.html',
    'guide/come-filtrare-richieste-clienti-prima-appuntamento.html',
  ];

  for (const relativeFile of files) {
    const absoluteFile = path.join(demoRoot, relativeFile);
    const html = await readFile(absoluteFile, 'utf8');

    if (!html.includes('rel="canonical"')) {
      throw new Error(`Canonical mancante in ${relativeFile}`);
    }
  }
}

await mkdir(publicDir, { recursive: true });
await validateCanonicalTargets();
await generateSitemap();
await generateRobots();
