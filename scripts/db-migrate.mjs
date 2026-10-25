// infra/database/migrations/*.sql 중 아직 적용 안 된 것을 이름순으로 적용하고 schema_migrations에 기록한다.
// 새 DB는 init/001에 모든 마이그레이션이 들어 있어 처음 실행 때 전부 다시 돌므로, 마이그레이션은 IF NOT EXISTS 등으로 재실행해도 안전하게 쓴다.
// 사용: 루트에서 npm run db:migrate (DATABASE_URL은 환경 변수 또는 .env)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
const dir = 'infra/database/migrations';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((row) => row.name));
  const pending = readdirSync(dir).filter((name) => name.endsWith('.sql') && !applied.has(name)).sort();
  for (const name of pending) {
    await client.query('BEGIN');
    try {
      await client.query(readFileSync(`${dir}/${name}`, 'utf8').replace(/^﻿/, '')); // Windows 편집기 BOM 제거
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`✔ ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`${name} 적용 실패: ${error.message}`);
    }
  }
  console.log(pending.length ? `마이그레이션 ${pending.length}개 적용` : '적용할 마이그레이션 없음');
} finally {
  await client.end();
}
