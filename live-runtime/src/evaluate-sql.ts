import type { EvaluateOptions, ExerciseEvaluator } from "./evaluate.js";

export class SqlEvaluator implements ExerciseEvaluator {
  async evaluate(
    code: string,
    envir?: string,
    options?: EvaluateOptions
  ): Promise<unknown> {
    console.log("SQL evaluate", { code, envir, options });

    return {
      type: "sql",
      code,
      envir,
      options,
    };
  }

  process(inputs: unknown): unknown {
    return inputs;
  }

  asOjs(value: unknown): string {
    return JSON.stringify(value);
  }

  asHtml(value: unknown): string {
    return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
  }
}