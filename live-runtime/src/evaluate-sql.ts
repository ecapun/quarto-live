import { PGlite } from "@electric-sql/pglite";
import { Indicator } from "./indicator";
import type { EnvLabel } from "./environment";
import {
  EvaluateContext,
  EvaluateOptions,
  EvaluateValue,
  ExerciseEvaluator,
  OJSEvaluateElement,
} from "./evaluate";

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

  container: OJSEvaluateElement;
  context: EvaluateContext;
  options: EvaluateOptions;
  nullResult: EvaluateValue;

  // nur damit das Interface erfüllt ist
  envManager: any;

  lastRunSql: string | null;
  lastRunResult: SqlEvaluateResult | null;
  lastRunError: string | null;

  constructor(context: EvaluateContext) {
    this.container = this.newContainer();
    this.context = context;
    this.nullResult = { result: null, evaluate_result: null, evaluator: this };
    this.container.value = this.nullResult;
    

    this.options = Object.assign(
      {
        envir: "global",
        eval: true,
        echo: false,
        warning: true,
        error: true,
        include: true,
        output: true,
        timelimit: 30,
        canvas: false,
      },
      context.options
    );

    this.envManager = null;

    this.lastRunSql = null;
    this.lastRunResult = null;
    this.lastRunError = null;
  }

  newContainer(): OJSEvaluateElement {
    const container = document.createElement("div") as OJSEvaluateElement;
    container.classList.add("cell-output-container");
    container.classList.add("cell-output-container-sql");
    return container;
  }

  static async getDb(label: string): Promise<PGlite> {
    let db = SqlEvaluator.dbs.get(label);
    if (!db) {
      db = await PGlite.create();
      SqlEvaluator.dbs.set(label, db);
    }
    return db;
  }

  getSetupCode(): string | undefined {
    const exId = this.options.exercise;
    if (!exId) return;

    const setup = document.querySelectorAll(
      `script[type="exercise-setup-${exId}-contents"]`
    );

    if (setup.length > 0) {
      if (setup.length > 1) {
        console.warn(`Multiple \`setup\` blocks found for exercise "${exId}", using the first.`);
      }
      const block = JSON.parse(atob(setup[0].textContent || ""));
      return block.code;
    }
  }

  async process(inputs: { [key: string]: any }): Promise<void> {
    if (!this.options.eval) {
      this.container = this.asSourceHTML(this.context.code);
      this.container.value = this.nullResult;
      return;
    }

    let ind = this.context.indicator;
    if (!this.context.indicator) {
      ind = new Indicator();
    }
    ind.running();

    try {
      void inputs;

      const envir = this.options.envir || "global";

      const setup = this.getSetupCode();
      if (setup && setup.trim() !== "") {
        await this.evaluate(setup, envir);
      }

      const result = await this.evaluate(this.context.code, envir);

      this.container = await this.asHtml(result);

      if (!this.options.output) {
        const value = this.container.value;
        this.container = this.newContainer();
        this.container.value = value;
      }
    } finally {
      ind.finished();
      if (!this.context.indicator) ind.destroy();
    }
  }

  async evaluate(
  code: string,
  envLabel: EnvLabel,
  options: EvaluateOptions = this.options
): Promise<SqlEvaluateResult | null> {
  if (code == null || code.trim() === "") {
    return null;
  }

  const db = await SqlEvaluator.getDb(String(envLabel));

  try {
    const rawResult = await db.exec(code);

    const results = Array.isArray(rawResult) ? rawResult : [rawResult];
    const tableResult =
      [...results].reverse().find((r: any) => Array.isArray(r?.rows) && r.rows.length > 0) ??
      results[results.length - 1];

    const rows = Array.isArray(tableResult?.rows) ? tableResult.rows : [];
    const columns = Array.isArray(tableResult?.fields)
      ? tableResult.fields.map((field: any) => field.name)
      : rows.length > 0
        ? Object.keys(rows[0] as Record<string, unknown>)
        : [];

    if (rows.length > 0) {
      const result: SqlEvaluateResult = {
        engine: "sql",
        code,
        envir: String(envLabel),
        success: true,
        output: {
          kind: "table",
          columns,
          rows: rows as Record<string, unknown>[],
        },
      };

      this.lastRunSql = code;
      this.lastRunResult = result;
      this.lastRunError = null;

      return result;
    }

    const result: SqlEvaluateResult = {
      engine: "sql",
      code,
      envir: String(envLabel),
      success: true,
      output: {
        kind: "text",
        value: "OK",
      },
    };

    this.lastRunSql = code;
    this.lastRunResult = result;
    this.lastRunError = null;

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    this.lastRunSql = code;
    this.lastRunResult = null;
    this.lastRunError = message;

    return {
      engine: "sql",
      code,
      envir: String(envLabel),
      success: false,
      output: {
        kind: "text",
        value: message,
      },
    };
  }
}

  asSourceHTML(code: string): OJSEvaluateElement {
    const sourceDiv = document.createElement("div") as OJSEvaluateElement;
    const sourcePre = document.createElement("pre");
    sourceDiv.className = "sourceCode";
    sourcePre.className = "sourceCode sql";
    sourcePre.textContent = code;
    sourceDiv.appendChild(sourcePre);
    return sourceDiv;
  }

  async asHtml(value: SqlEvaluateResult | null): Promise<OJSEvaluateElement> {
    const container = this.newContainer();
    container.value = this.nullResult;

    if (!value) {
      return container;
    }

    if (value.output.kind === "table" && value.output.columns && value.output.rows) {
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");

      for (const col of value.output.columns) {
        const th = document.createElement("th");
        th.textContent = col;
        headRow.appendChild(th);
      }

      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      for (const row of value.output.rows) {
        const tr = document.createElement("tr");
        for (const col of value.output.columns) {
          const td = document.createElement("td");
          td.textContent = String(row[col] ?? "");
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      container.appendChild(table);
    } else {
      const pre = document.createElement("pre");
      pre.textContent = value.output.value ?? "";
      container.appendChild(pre);
    }

    container.value.result = value;
    container.value.evaluate_result = value;
    return container;
  }

  async asOjs(value: SqlEvaluateResult | null): Promise<any> {
    return value;
  }
}