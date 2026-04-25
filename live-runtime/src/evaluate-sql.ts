import type {EvaluateOptions, ExerciseEvaluator, EvaluateContext, OJSEvaluateElement} from "./evaluate.js";
import type {EngineEnvironment, EnvironmentManager} from "./environment.js";

type SqlEvaluateResult = {
  engine: "sql";
  code: string;
  envir?: string;
  success: boolean;
  output: {
    kind: "text";
    value: string;
  };
};

export class SqlEvaluator implements ExerciseEvaluator {
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

  async evaluate(
    code: string,
    envir?: string,
    options?: EvaluateOptions
  ): Promise<SqlEvaluateResult> {
    this.context = {
      code,
      options: options ?? this.options,
    };

    return {
      engine: "sql",
      code,
      envir,
      success: true,
      output: {
        kind: "text",
        value: code,
      },
    };
  }

  async process(inputs: { [key: string]: any }): Promise<void> {
    void inputs;
  }

  async asOjs(value: SqlEvaluateResult): Promise<any> {
    return value;
  }

  async asHtml(value: SqlEvaluateResult): Promise<OJSEvaluateElement> {
    const el = document.createElement("div") as OJSEvaluateElement;
    el.innerHTML = `<pre>${value.output.value}</pre>`;
    el.value = {
      evaluator: this,
      result: value,
      evaluate_result: value,
    };
    return el;
  }
}