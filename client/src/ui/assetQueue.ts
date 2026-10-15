export type AssetPriority = 'high' | 'low';
/** Shared admission control: speculative work cannot occupy foreground slots. */
export function createAssetQueue(limit = 8, backgroundLimit = 2) {
  type Job = { priority: AssetPriority; run: () => void };
  const jobs: Job[] = [];
  let active = 0, background = 0;
  function pump() {
    while (active < limit) {
      let index = jobs.findIndex(job => job.priority === 'high');
      if (index < 0 && background < backgroundLimit) index = jobs.findIndex(job => job.priority === 'low');
      if (index < 0) return;
      const job = jobs.splice(index, 1)[0], low = job.priority === 'low';
      active++; if (low) background++;
      job.run();
    }
  }
  return {
    add<T>(work: () => Promise<T>, priority: AssetPriority) {
      let job: Job;
      const promise = new Promise<T>((resolve, reject) => {
        job = { priority, run: () => {
          const low = job.priority === 'low';
          Promise.resolve().then(work).then(resolve, reject).finally(() => {
            active--; if (low) background--; pump();
          });
        } };
        jobs.push(job);
      });
      // Coalesce calls in the same turn so foreground requests jump the queue.
      queueMicrotask(pump);
      return { promise, promote() { if (jobs.includes(job!)) job!.priority = 'high'; pump(); } };
    },
  };
}
