import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

/**
 * Container image is pinned to the same major version as docker-compose.yml
 * so tests and local development exercise identical PostgreSQL behaviour.
 */
const POSTGRES_IMAGE = 'postgres:18-alpine';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject): Promise<void> {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  project.provide('databaseUrl', container.getConnectionUri());
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
