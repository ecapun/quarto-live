import { ExerciseGrader } from "./grader";

type SqlFeedback = {
  correct: boolean;
  message: string;
  type?: "success" | "info" | "warning" | "error";
};

function sqlTextLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
function buildSqlCheckContext(userCode: string): string {
  return `
    DROP TABLE IF EXISTS __quarto_check_context;
    CREATE TEMP TABLE __quarto_check_context (
      user_code TEXT
    );
    INSERT INTO __quarto_check_context (user_code)
    VALUES (${sqlTextLiteral(userCode)});
  `;
}

export class SqlGrader extends ExerciseGrader {
  constructor(evaluator: any) {
    super(evaluator);
  }

  async gradeExercise(): Promise<HTMLElement | null> {
    const userCode = this.context.code;

    if (!userCode || userCode.trim() === "") {
      return null;
    }

    if (this.evaluator.lastRunError) {
      return this.feedbackAsHtmlAlert({
        correct: false,
        message: this.evaluator.lastRunError,
        type: "error",
      });
    }

    const checkCode = this.getCheckingAlgorithm();
    if (!checkCode || checkCode.trim() === "") {
      return null;
    }

    const feedback = await this.evaluateCheck(checkCode);
    if (!feedback) {
      return null;
    }

    return this.feedbackAsHtmlAlert(feedback);
  }

  async evaluateCheck(checkCode: string): Promise<SqlFeedback | null> {
    const userCode = this.evaluator.lastRunSql ?? this.context.code ?? "";
    const chekckCodeWithContext = `${buildSqlCheckContext(userCode)}\n${checkCode}`;
    
    const result = await this.evaluator.executeCheck(chekckCodeWithContext);

    // Cleanup: remove __quarto_check_context after check execution
    await this.evaluator.executeCheck("DROP TABLE IF EXISTS __quarto_check_context;");
    
    if (!result) {
      return {
        correct: false,
        message: "Check returned no result.",
        type: "error",
      };
    }

    if (!result.success) {
      return {
        correct: false,
        message: result.output.value ?? "Check execution failed.",
        type: "error",
      };
    }

    if (result.output.kind === "table" && result.output.rows && result.output.rows.length > 0) {
      const firstRow = result.output.rows[0];
      const values = Object.values(firstRow);

      if (values.length > 0) {
        const firstValue = values[0];

        if (typeof firstValue === "boolean") {
          return {
            correct: firstValue,
            message: firstValue ? "Correct." : "Not correct yet.",
            type: firstValue ? "success" : "error",
          };
        }

        if (typeof firstValue === "number") {
          const ok = firstValue !== 0;
          return {
            correct: ok,
            message: ok ? "Correct." : "Not correct yet.",
            type: ok ? "success" : "error",
          };
        }

        if (typeof firstValue === "string") {
          const normalized = firstValue.trim().toLowerCase();
          const ok =
            normalized === "true" ||
            normalized === "ok" ||
            normalized === "correct" ||
            normalized === "1";

          return {
            correct: ok,
            message: ok ? "Correct." : firstValue,
            type: ok ? "success" : "error",
          };
        }
      }
    }

    return {
      correct: true,
      message: "Check executed successfully.",
      type: "success",
    };
  }

  feedbackAsHtmlAlert(feedback: SqlFeedback): HTMLElement {
    const container = document.createElement("div");
    container.classList.add("alert");
    container.classList.add("exercise-grade");

    switch (feedback.type) {
      case "success":
        container.classList.add("alert-success");
        break;
      case "info":
        container.classList.add("alert-info");
        break;
      case "warning":
        container.classList.add("alert-warning");
        break;
      case "error":
      default:
        container.classList.add("alert-danger");
        break;
    }

    const content = document.createElement("span");
    content.className = "exercise-feedback";
    content.textContent = feedback.message;
    container.appendChild(content);

    return container;
  }
}