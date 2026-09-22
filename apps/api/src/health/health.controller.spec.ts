import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    // Resolving through the Nest testing module rather than `new` on purpose:
    // it proves dependency injection works under the SWC transform.
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports the process as alive', () => {
    expect(controller.check()).toMatchObject({ status: 'ok' });
  });

  it('reports a non-negative uptime', () => {
    expect(controller.check().uptime).toBeGreaterThanOrEqual(0);
  });
});
