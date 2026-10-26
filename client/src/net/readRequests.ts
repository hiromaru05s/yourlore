/** Share only concurrent reads. Never reuse a settled response or a pre-write read. */
export class ReadRequests {
  private pending = new Map<string, Promise<unknown>>();

  clear(): void { this.pending.clear(); }

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    let request = this.pending.get(key);
    if (!request) {
      request = load();
      this.pending.set(key, request);
    }
    try {
      // Callers may update their own view model; don't share mutable objects.
      return structuredClone(await request) as T;
    } finally {
      if (this.pending.get(key) === request) this.pending.delete(key);
    }
  }
}
