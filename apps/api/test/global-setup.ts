import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

/**
 * Container image is pinned to the same major version as docker-compose.yml
 * so tests and local development exercise identical PostgreSQL behaviour.
 */
const POSTGRES_IMAGE = 'postgres:18-alpine';

// The package compiles to CommonJS, so __dirname rather than import.meta.
const API_ROOT = resolve(__dirname, '..');

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject): Promise<void> {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const databaseUrl = container.getConnectionUri();

  applyMigrations(databaseUrl);
  project.provide('databaseUrl', databaseUrl);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}

/**
 * Runs the committed migrations exactly as a deployment would, which also
 * proves they apply cleanly to an empty database. The project's pinned
 * Prisma CLI is invoked directly rather than through npx, which may resolve
 * a different version.
 */
function applyMigrations(databaseUrl: string): void {
  const prismaCli = createRequire(__filename).resolve('prisma/build/index.js');

  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
