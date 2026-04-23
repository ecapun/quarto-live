import type { ExerciseGrader, GradeResult } from "./grader.js";

export class SqlGrader implements ExerciseGrader {
  async grade(
    userCode: string,
    checkCode: string,
    envir?: string
  ): Promise<GradeResult> {
    console.log("SQL grade", { userCode, checkCode, envir });

    return {
      correct: true,
      message: "SQL grading placeholder",
    };
  }
}