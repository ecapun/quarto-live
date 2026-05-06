export type SqlSchema = Record<string, string[]>;

type PGliteLike = {

  exec: (sql: string) => Promise<any>;

};

function rowsFromExecResult(result: any): any[] {

  if (Array.isArray(result)) {

    return result.flatMap((entry) =>

      Array.isArray(entry?.rows) ? entry.rows : []

    );

  }

  return Array.isArray(result?.rows) ? result.rows : [];

}

export async function getSqlSchema(pg: PGliteLike): Promise<SqlSchema> {

  const result = await pg.exec(`

    SELECT

      table_name,

      column_name

    FROM information_schema.columns

    WHERE table_schema = 'public'

    ORDER BY table_name, ordinal_position

  `);

  const rows = rowsFromExecResult(result);

  const schema: SqlSchema = {};

  for (const row of rows) {

    const tableName = String(row.table_name ?? "");

    const columnName = String(row.column_name ?? "");

    if (!tableName || !columnName) continue;

    if (!schema[tableName]) {

      schema[tableName] = [];

    }

    schema[tableName].push(columnName);

  }

  return schema;

}
