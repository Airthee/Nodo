export interface LogRecord {
  level: 'info' | 'warn' | 'error';
  msg: string;
  [key: string]: unknown;
}

export function log(record: LogRecord): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record });
  if (record.level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}
