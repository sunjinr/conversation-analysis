declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    getRowsModified(): number
    export(): Uint8Array
    close(): void
  }

  interface Statement {
    bind(params?: any[]): boolean
    step(): boolean
    get(params?: any[]): any[]
    getColumnNames(): string[]
    free(): boolean
    run(params?: any[]): void
  }

  interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  export { Database, Statement, QueryExecResult, SqlJsStatic }
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}
declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    getRowsModified(): number
    export(): Uint8Array
    close(): void
  }

  interface Statement {
    bind(params?: any[]): boolean
    step(): boolean
    get(params?: any[]): any[]
    getColumnNames(): string[]
    free(): boolean
    run(params?: any[]): void
  }

  interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  export { Database, Statement, QueryExecResult, SqlJsStatic }
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}
