import { Controller, Get } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  uptime: number;
}

/**
 * Liveness probe.
 *
 * Deliberately does not touch the database: this answers "is the process
 * running", not "can it serve traffic". A readiness probe belongs with the
 * first real persistence work.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
    };
  }
}
