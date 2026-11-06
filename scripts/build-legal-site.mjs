// Publishes the in-app policy texts as static pages for the store listings (privacy policy URL).
// Output: docs/legal/*.html, served by GitHub Pages
// ("Deploy from a branch" → main /docs) at https://<owner>.github.io/OurShare/legal/<page>.html
//
// Usage: node scripts/build-legal-site.mjs   (reads EXPO_PUBLIC_SUPPORT_EMAIL / EXPO_PUBLIC_OPERATOR_NAME
// from the environment or .env.local — the same values the app build uses)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { buildPolicyDocs } from '../src/features/legal/policy-texts.ts';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'docs/legal');

function envValue(name) {
  if (process.env[name]) return process.env[name];
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : '';
}

const contact = { email: envValue('EXPO_PUBLIC_SUPPORT_EMAIL'), operator: envValue('EXPO_PUBLIC_OPERATOR_NAME') };
if (!contact.email || !contact.operator) {
  console.error('EXPO_PUBLIC_SUPPORT_EMAIL and EXPO_PUBLIC_OPERATOR_NAME are required (env or .env.local).');
  process.exit(1);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = (s) => esc(s).replace(/https?:\/\/[^\s)]+/g, (u) => `<a href="${u}">${u}</a>`).replace(/\n/g, '<br>');

function page(doc) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.title)} · 우리몫</title>
<style>
  :root { color-scheme: light dark; --bg: #FBFAF7; --card: #fff; --text: #1A1A1F; --sub: #6B6B76; --accent: #2E7D32; }
  @media (prefers-color-scheme: dark) { :root { --bg: #17181C; --card: #1C1C21; --text: #F2F2F5; --sub: #A0A0AB; --accent: #9CDB9F; } }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.65 -apple-system, 'Apple SD Gothic Neo', 'Pretendard', 'Malgun Gothic', sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 26px; margin: 0 0 4px; } .date { color: var(--sub); font-size: 14px; margin: 0 0 24px; }
  section { background: var(--card); border-radius: 16px; padding: 16px 20px; margin: 0 0 12px; }
  h2 { font-size: 17px; margin: 0 0 6px; } p { margin: 0; word-break: keep-all; overflow-wrap: anywhere; }
  a { color: var(--accent); } .brand { color: var(--accent); font-weight: 800; letter-spacing: -0.02em; }
</style>
</head>
<body><main>
<p class="brand">우리몫</p>
<h1>${esc(doc.title)}</h1>
<p class="date">시행일 ${doc.updatedAt}</p>
${doc.sections.map((s) => `<section><h2>${esc(s.heading)}</h2><p>${linkify(s.body)}</p></section>`).join('\n')}
</main></body>
</html>
`;
}

const docs = buildPolicyDocs(contact);
mkdirSync(OUT, { recursive: true });
for (const [name, doc] of Object.entries(docs)) writeFileSync(join(OUT, `${name}.html`), page(doc));
writeFileSync(
  join(OUT, 'index.html'),
  page({ title: '정책 문서', updatedAt: docs.privacy.updatedAt, sections: Object.entries(docs).map(([name, d]) => ({ heading: d.title, body: `${name}.html` })) })
    .replace(/<p>([\w-]+\.html)<\/p>/g, '<p><a href="$1">$1</a></p>'),
);
console.log(`wrote ${Object.keys(docs).length + 1} pages to ${OUT}`);
