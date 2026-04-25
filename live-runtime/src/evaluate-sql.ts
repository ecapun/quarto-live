import { PGlite } from "@electric-sql/pglite";

import type {
  EvaluateOptions,
  ExerciseEvaluator,
  EvaluateContext,
  OJSEvaluateElement,
} from "./evaluate.js";
import type {
  EngineEnvironment,
  EnvironmentManager,
} from "./environment.js";

type SqlEvaluateResult = {
  engine: "sql";
  code: string;
  envir?: string;
  success: boolean;
  output: {
    kind: "text" | "table";
    value?: string;
    columns?: string[];
    rows?: Record<string, unknown>[];
  };
};

export class SqlEvaluator implements ExerciseEvaluator {
  static dbs: Map<string, PGlite> = new Map();

  context: EvaluateContext;
  options: EvaluateOptions;
  envManager: EnvironmentManager<EngineEnvironment>;
  container: OJSEvaluateElement;

  constructor(
    options: EvaluateOptions,
    envManager: EnvironmentManager<EngineEnvironment>,
    container: OJSEvaluateElement
  ) {
    this.options = options;
    this.envManager = envManager;
    this.container = container;

    this.context = {
      code: "",
      options,
    };
  }

  private static async getDb(envir = "global"): Promise<PGlite> {
    let db = SqlEvaluator.dbs.get(envir);

    if (!db) {
      db = await PGlite.create();
      SqlEvaluator.dbs.set(envir, db);
    }

    return db;
  }

  async evaluate(
    code: string,
    envir?: string,
    options?: EvaluateOptions
  ): Promise<SqlEvaluateResult> {
    const effectiveOptions = options ?? this.options;
    const effectiveEnvir = envir ?? effectiveOptions.envir ?? "global";

    this.context = {
      code,
      options: effectiveOptions,
    };

    try {
      const db = await SqlEvaluator.getDb(effectiveEnvir);
      const rawResult = await db.exec(code);

      const firstResult = Array.isArray(rawResult) ? rawResult[0] : null;
      const rows = Array.isArray(firstResult?.rows) ? firstResult.rows : [];
      const columns = Array.isArray(firstResult?.fields)
        ? firstResult.fields.map((field: any) => field.name)
        : rows.length > 0
          ? Object.keys(rows[0] as Record<string, unknown>)
          : [];

      if (rows.length > 0) {
        return {
          engine: "sql",
          code,
          envir: effectiveEnvir,
          success: true,
          output: {
            kind: "table",
            columns,
            rows: rows as Record<string, unknown>[],
          },
        };
      }

      return {
        engine: "sql",
        code,
        envir: effectiveEnvir,
        success: true,
        output: {
          kind: "text",
          value: "OK",
        },
      };
    } catch (error) {
      return {
        engine: "sql",
        code,
        envir: effectiveEnvir,
        success: false,
        output: {
          kind: "text",
          value: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async process(inputs: { [key: string]: any }): Promise<void> {
    void inputs;
  }

  async asOjs(value: SqlEvaluateResult): Promise<any> {
    return value;
  }

  async asHtml(value: SqlEvaluateResult): Promise<OJSEvaluateElement> {
    const el = document.createElement("div") as OJSEvaluateElement;

    if (value.output.kind === "table" && value.output.columns && value.output.rows) {
      const thead = `
        <thead>
          <tr>
            ${value.output.columns.map((col) => `<th>${col}</th>`).join("")}
          </tr>
        </thead>
      `;

      const tbody = `
        <tbody>
          ${value.output.rows
            .map(
              (row) => `
                <tr>
                  ${value.output.columns!
                    .map((col) => `<td>${String(row[col] ?? "")}</td>`)
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      `;

      el.innerHTML = `<table>${thead}${tbody}</table>`;
    } else {
      el.innerHTML = `<pre>${value.output.value ?? ""}</pre>`;
    }

    el.value = {
      evaluator: this,
      result: value,
      evaluate_result: value,
    };

    return el;
  }
}