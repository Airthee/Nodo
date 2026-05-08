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

export function nextLocalTs(shareClock: number): number {
  return Math.max(Date.now(), shareClock + 1);
}

export function bumpClock(shareClock: number, remoteTs: number): number {
  return Math.max(shareClock, remoteTs);
}
