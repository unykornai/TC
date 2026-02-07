/**
 * OPTKAS Documentation Site Builder
 *
 * Reads all /docs/*.md files, generates a static HTML documentation site
 * with navigation, search, and consistent styling matching the OPTKAS brand.
 *
 * Output: /apps/docs-site/dist/
 */

import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = path.join(__dirname, '..', '..', '..', 'docs');
const OUTPUT_DIR = path.join(__dirname, '..', 'dist');

interface DocPage {
  filename: string;
  title: string;
  slug: string;
  content: string;
}

function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1];
  return filename.replace(/\.md$/, '').replace(/_/g, ' ');
}

function markdownToHtml(md: string): string {
  let html = md;
  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Paragraphs
  html = html.replace(/^(?!<[hluop]|<\/[hluop]|<li|<pre|<code)(.+)$/gm, '<p>$1</p>');
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr>');
  return html;
}

function generatePage(page: DocPage, allPages: DocPage[]): string {
  const nav = allPages.map(p =>
    `<a href="${p.slug}.html" class="${p.slug === page.slug ? 'active' : ''}">${p.title}</a>`
  ).join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} — OPTKAS Documentation</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --text: #d0d0d0;
      --text-muted: #8888aa;
      --accent: #c9a84c;
      --accent-dim: rgba(201,168,76,0.12);
      --code-bg: #1a1a2e;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 280px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 1.5rem 0;
      overflow-y: auto;
      position: fixed;
      top: 0;
      bottom: 0;
    }
    .sidebar .brand {
      padding: 0 1.5rem 1.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1rem;
    }
    .sidebar .brand h1 { color: var(--accent); font-size: 1.1rem; letter-spacing: 0.08em; }
    .sidebar .brand p { color: var(--text-muted); font-size: 0.7rem; margin-top: 0.3rem; }
    .sidebar a {
      display: block;
      padding: 0.5rem 1.5rem;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.8rem;
      border-left: 3px solid transparent;
      transition: all 0.2s;
    }
    .sidebar a:hover { color: var(--text); background: var(--accent-dim); }
    .sidebar a.active {
      color: var(--accent);
      border-left-color: var(--accent);
      background: var(--accent-dim);
    }
    .content {
      margin-left: 280px;
      padding: 3rem;
      max-width: 900px;
      flex: 1;
    }
    .content h1 { color: var(--accent); font-size: 1.8rem; margin-bottom: 1.5rem; }
    .content h2 { color: var(--accent); font-size: 1.3rem; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
    .content h3 { color: var(--text); font-size: 1.1rem; margin: 1.5rem 0 0.8rem; }
    .content p { line-height: 1.7; margin-bottom: 1rem; }
    .content code { background: var(--code-bg); padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.85em; }
    .content pre {
      background: var(--code-bg);
      padding: 1.2rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid var(--border);
    }
    .content pre code { background: none; padding: 0; }
    .content ul { padding-left: 1.5rem; margin-bottom: 1rem; }
    .content li { line-height: 1.7; margin-bottom: 0.3rem; }
    .content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
    .content strong { color: var(--accent); }
    .content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .content th { background: var(--surface); color: var(--accent); text-align: left; padding: 0.6rem; border: 1px solid var(--border); font-size: 0.8rem; }
    .content td { padding: 0.6rem; border: 1px solid var(--border); font-size: 0.85rem; }
  </style>
</head>
<body>
  <nav class="sidebar">
    <div class="brand">
      <h1>◈ OPTKAS</h1>
      <p>Sovereign Financial Infrastructure</p>
    </div>
    <div class="nav-links">
      ${nav}
    </div>
  </nav>
  <main class="content">
    ${markdownToHtml(page.content)}
  </main>
</body>
</html>`;
}

function build(): void {
  console.log('Building OPTKAS documentation site...');

  // Read all markdown files
  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
  const pages: DocPage[] = files.map(filename => {
    const content = fs.readFileSync(path.join(DOCS_DIR, filename), 'utf-8');
    const slug = filename.replace(/\.md$/, '').toLowerCase();
    return {
      filename,
      title: extractTitle(content, filename),
      slug,
      content
    };
  });

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate pages
  for (const page of pages) {
    const html = generatePage(page, pages);
    const outputPath = path.join(OUTPUT_DIR, `${page.slug}.html`);
    fs.writeFileSync(outputPath, html);
    console.log(`  ✓ ${page.slug}.html`);
  }

  // Generate index
  const indexPage: DocPage = {
    filename: 'index.md',
    title: 'OPTKAS Documentation',
    slug: 'index',
    content: `# OPTKAS Documentation

Welcome to the OPTKAS sovereign multi-ledger financial infrastructure documentation.

## Quick Links

${pages.map(p => `- [${p.title}](${p.slug}.html)`).join('\n')}

## Architecture

OPTKAS operates on a 5-layer architecture:

1. **Legal & Control Plane** — Entity governance, compliance, legal agreements
2. **Custody & Banking Plane** — Key management, account control, fiat rails
3. **Automation & Intelligence Plane** — Scripts, monitoring, reconciliation
4. **Ledger Evidence Plane** — XRPL + Stellar on-chain records
5. **Representation & Liquidity Plane** — Tokens, DEX, AMM, trading

## Getting Started

See [First Successful Run](first_successful_run.html) for testnet validation.

See [Runbooks](runbooks.html) for operational procedures.
`
  };

  const indexHtml = generatePage(indexPage, pages);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml);
  console.log('  ✓ index.html');

  console.log(`\n  ✓ ${pages.length + 1} pages generated in ${OUTPUT_DIR}`);
}

build();
