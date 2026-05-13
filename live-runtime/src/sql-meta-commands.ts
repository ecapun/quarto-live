import { describe, describeDataToString } from "psql-describe";
import type { PGlite } from "@electric-sql/pglite";
type SqlOutput =
    | {
        kind: "table";
        columns: string[];
        rows: Record<string, unknown>[];
    }
    | {
        kind: "text";
        value: string;
};

export const SQL_META_COMMANDS = [
    { command: "\\?", detail: "Show help" },
    { command: "\\d", detail: "List relations or describe relation" },
    { command: "\\dt", detail: "List tables" },
    { command: "\\du", detail: "List roles" },
    { command: "\\dg", detail: "List roles" },
    { command: "\\dn", detail: "List schemas" },
    { command: "\\dv", detail: "List views" },
    { command: "\\di", detail: "List indexes" },
    { command: "\\ds", detail: "List sequences" },
] as const;

export function isSqlMetaCommand(code: string): boolean {
    return code.trimStart().startsWith("\\");
}

export async function executeSqlMetaCommand(
    code: string,
    db: PGlite
    ): Promise<SqlOutput> {
    let lastResult: any | undefined;

    const capturedOutput: Array<string | Record<string, any>> = [];

    const { promise } = describe(
    code.trim(),
    "postgres",
    async (sql: string) => {
        lastResult = (await db.exec(sql, { rowMode: "array" }))[0];
        return {
            rows: lastResult?.rows ?? [],
            fields: lastResult?.fields ?? [],
            rowCount: lastResult?.rows?.length ?? 0,
        };
    },
    (output: string | Record<string, any>) => {
        capturedOutput.push(output);
    }
    );

    await promise;

    return normalizeDescribeOutput(capturedOutput, lastResult);
}

function normalizeDescribeOutput(
    outputItems: Array<string | Record<string, any>>,
    lastResult: any | undefined
    ): SqlOutput {

    const textOutput = outputItems
    .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item.title === "string" && item.title.trim() !== "") {
        return item.title;
        }
        return describeDataToString(item);
    })
    .filter((value) => value.trim() !== "")
    .join("\n\n");
    
    const rows = Array.isArray(lastResult?.rows)
    ? (lastResult.rows as unknown[][])
    : [];

    const fields = Array.isArray(lastResult?.fields) ? lastResult.fields : [];
    
    if (rows.length > 0 && fields.length > 0) {
    const columns = fields.map((field: any) => String(field.name));
    return {
        kind: "table",
        columns,
        rows: rows.map((row) => {
        const record: Record<string, unknown> = {};
        columns.forEach((column, index) => {
            record[column] = row[index];
        });
            return record;
        }),
    };
    }

    return {
        kind: "text",
        value: textOutput || "OK",
    };
}