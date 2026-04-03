import fs from 'node:fs';
import path from 'node:path';
import { repoRoot, n8nWorkflowsDir } from './workflow-manifest.mjs';

const checks = [
  { label: 'Root env example', path: path.join(repoRoot, '.env.example') },
  { label: 'Dashboard env example', path: path.join(repoRoot, 'dashboard/.env.example') },
  { label: 'Demo env example', path: path.join(repoRoot, 'demo/.env.example') },
  { label: 'Workflow output dir', path: n8nWorkflowsDir },
];

const missing = checks.filter((entry) => !fs.existsSync(entry.path));

if (missing.length > 0) {
  console.error('Workspace setup check failed.\n');
  for (const entry of missing) {
    console.error(`- Missing: ${entry.label} -> ${entry.path}`);
  }
  process.exit(1);
}

console.log('Workspace setup check passed.');
