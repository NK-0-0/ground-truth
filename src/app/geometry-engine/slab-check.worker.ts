/// <reference lib="webworker" />

import { verify } from './slab-check';
import type { WorkerRequest, WorkerResponse } from './slab-check.messages';

const reply = (m: WorkerResponse) => postMessage(m);

addEventListener('message', ({ data: m }: MessageEvent<WorkerRequest>) => {
  try {
    if (m.type === 'option') {
      const result = verify([m.feature], m.envelopes, (text) => reply({ type: 'progress', text }));
      reply({ type: 'option', result });
      return;
    }
    for (const key of ['canonical', 'controlled'] as const) {
      const result = verify(m.data.sets[key].features, m.data.envelopes, (s) =>
        reply({ type: 'progress', text: key + ' · ' + s }),
      );
      reply({ type: 'result', key, result });
    }
    reply({ type: 'done' });
  } catch (e) {
    reply({ type: 'failure', error: (e as Error).message });
  }
});
