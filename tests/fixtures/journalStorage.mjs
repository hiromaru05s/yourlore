const stores = new WeakMap();
export function journalState(state) {
  if (!state.storage) return state;
  if (!stores.has(state.storage)) {
    const original = state.storage, journal = new Map();
    stores.set(original, {
      setAlarm: (...args) => original.setAlarm(...args),
      deleteAlarm: (...args) => original.deleteAlarm(...args),
      get: async key => key === 'room' ? original.get(key) : structuredClone(journal.get(key)),
      put: async (key, value) => {
        if (typeof key === 'string') {
          if (key === 'room') return original.put(key, value);
          journal.set(key, structuredClone(value)); return;
        }
        // Exercise the original failure injection before committing the journal.
        if ('room' in key) await original.put('room', key.room);
        for (const [k,v] of Object.entries(key)) if (k !== 'room') journal.set(k, structuredClone(v));
      },
      list: async ({prefix}) => new Map([...journal].filter(([k]) => k.startsWith(prefix)).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, structuredClone(v)])),
    });
  }
  return {...state, storage:stores.get(state.storage)};
}
