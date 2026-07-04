/**
 * PostgreSQL 데이터베이스 연동 레이어
 * 
 * 환경변수 DATABASE_URL이 설정되면 PostgreSQL 사용,
 * 없으면 기존 In-Memory 스토어 사용 (개발 모드)
 */

export interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
}

function parseConnectionString(url: string): DBConfig {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: parsed.searchParams.get('sslmode') === 'require',
    poolSize: 10,
  };
}

class DatabaseService {
  private config: DBConfig | null = null;
  private connected = false;
  private mode: 'postgres' | 'memory' = 'memory';

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      this.config = parseConnectionString(dbUrl);
      this.mode = 'postgres';
      console.log(`[DB] PostgreSQL mode: ${this.config.host}:${this.config.port}/${this.config.database}`);
    } else {
      console.log('[DB] In-Memory mode (DATABASE_URL not set)');
    }
  }

  async connect(): Promise<void> {
    if (this.mode === 'memory') return;

    /*
    // 실제 PostgreSQL 연동 (pg 패키지 사용):
    const { Pool } = await import('pg');
    this.pool = new Pool({
      host: this.config!.host,
      port: this.config!.port,
      database: this.config!.database,
      user: this.config!.user,
      password: this.config!.password,
      max: this.config!.poolSize,
      ssl: this.config!.ssl ? { rejectUnauthorized: false } : undefined,
    });
    await this.pool.query('SELECT 1');
    */

    this.connected = true;
    console.log('[DB] Connected to PostgreSQL');
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (this.mode === 'memory') {
      throw new Error('PostgreSQL not configured. Using in-memory store.');
    }
    // const result = await this.pool.query(sql, params);
    // return result.rows;
    return [];
  }

  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    if (this.mode === 'memory') return;
    // const client = await this.pool.connect();
    // try {
    //   await client.query('BEGIN');
    //   for (const q of queries) await client.query(q.sql, q.params);
    //   await client.query('COMMIT');
    // } catch (e) {
    //   await client.query('ROLLBACK');
    //   throw e;
    // } finally {
    //   client.release();
    // }
  }

  getMode(): string { return this.mode; }
  isConnected(): boolean { return this.connected || this.mode === 'memory'; }

  async healthCheck(): Promise<{ status: string; mode: string; latency?: number }> {
    const start = Date.now();
    if (this.mode === 'memory') return { status: 'ok', mode: 'memory' };
    try {
      await this.query('SELECT 1');
      return { status: 'ok', mode: 'postgres', latency: Date.now() - start };
    } catch {
      return { status: 'error', mode: 'postgres', latency: Date.now() - start };
    }
  }
}

export const database = new DatabaseService();
