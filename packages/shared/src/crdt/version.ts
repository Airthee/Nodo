export interface VersionMeta {
  ts: number;
  deviceId: string;
}

export function compareVersion(a: VersionMeta, b: VersionMeta): -1 | 0 | 1 {
  if (a.ts < b.ts) return -1;
  if (a.ts > b.ts) return 1;
  if (a.deviceId < b.deviceId) return -1;
  if (a.deviceId > b.deviceId) return 1;
  return 0;
}

export function versionEquals(a: VersionMeta, b: VersionMeta): boolean {
  return a.ts === b.ts && a.deviceId === b.deviceId;
}

// A device clock owns the last issued ts so that two ops issued within the same
// millisecond still get distinct, strictly increasing ts. applyOperation treats
// an equal VersionMeta as "not newer", so a repeated ts would drop the op.
export interface DeviceClock {
  // Issues a ts strictly greater than every ts issued or observed so far.
  next(): number;
  // Folds in a ts seen on a remote op so later local ts sort after it.
  observe(remoteTs: number): void;
  // The last issued or observed ts.
  current(): number;
}

export function createDeviceClock(initial = 0, now: () => number = Date.now): DeviceClock {
  let last = initial;
  return {
    next() {
      last = Math.max(now(), last + 1);
      return last;
    },
    observe(remoteTs) {
      last = Math.max(last, remoteTs);
    },
    current() {
      return last;
    },
  };
}
