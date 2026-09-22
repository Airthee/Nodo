import { openDatabase } from './db';
import { buildApp } from './app';
import { log } from './services/logger';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const dbPath = process.env.DATABASE_PATH ?? './nodo-server.sqlite';

const db = openDatabase(dbPath);
const { app } = buildApp({ db, gitSha: process.env.GIT_SHA });

log({ level: 'info', msg: 'starting', port, dbPath });

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 0,
};
