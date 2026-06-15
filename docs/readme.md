# Quarto Live SQL Extension (PGlite)

A prototype extension of [Quarto Live](https://github.com/r-wasm/quarto-live) adding a client-side SQL execution environment powered by [PGlite](https://pglite.dev/).

Bachelor's thesis by **Emirhan Capun**, FH Vorarlberg, 2026.  
Branch: `feature/sqlrepl`

---

## Overview

This extension allows interactive SQL exercises to be embedded directly into Quarto documents, running entirely in the browser without an external database server. SQL is integrated as a new execution type within the existing Quarto Live framework.

### Features

- **Client-side SQL execution** via PGlite (PostgreSQL via WebAssembly)
- **Normal SQL code blocks** with a shared global database state
- **Isolated SQL exercises** with a dedicated database context per exercise
- **Shared environments** for follow-on exercises that build on each other
- **Setup blocks** to prepare the database state before learner execution
- **Check blocks** for automatic grading of exercise solutions
- **Schema-aware autocomplete** based on the current PGlite instance
- **Psql-style meta commands** (`\dt`, `\d`, `\du` etc.)
- **Editor options** `edit` and `autorun`

---

## Requirements

- [Quarto](https://quarto.org/) >= 1.6
- [Node.js](https://nodejs.org/) >= 18

---

## Setup

```bash
git clone https://github.com/ecapun/quarto-live.git
cd quarto-live
git checkout feature/sqlrepl
npm install
npm run build
```

---

## Rendering the documentation

```bash
cd docs
quarto render sql-test-execution.qmd
quarto render sql-test-exercises.qmd
quarto render sql-test-environments.qmd
quarto render sql-test-grading.qmd
quarto render sql-test-editor.qmd
quarto render sql-test-meta.qmd
cd _site
npx serve .
```

Then open `http://localhost:3000` in your browser.

---

## Usage

### Normal SQL block

A normal SQL block shares the global database state with other normal blocks on the same page:

    ```{sql}
    CREATE TABLE students (id INTEGER, name TEXT);
    INSERT INTO students VALUES (1, 'Ada'), (2, 'Linus');
    SELECT * FROM students;
    ```

### SQL exercise with setup and check

    ```{sql}
    #| exercise: task1
    #| setup: true
    CREATE TABLE products (id INTEGER, name TEXT, price NUMERIC);
    INSERT INTO products VALUES (1, 'Book', 20), (2, 'Pen', 5);
    ```

    ```{sql}
    #| exercise: task1
    SELECT * FROM products WHERE price > 10;
    ```

    ```{sql}
    #| exercise: task1
    #| check: true
    SELECT COUNT(*) = 1 AS passed FROM products WHERE price > 10;
    ```

### Shared environment

    ```{sql}
    #| exercise: task1
    #| envir: shared
    INSERT INTO shared_table VALUES (1, 'first');
    ```

    ```{sql}
    #| exercise: task2
    #| envir: shared
    SELECT * FROM shared_table;
    ```

---

## Project structure

**Source files (`src/`)**
- `evaluate-sql.ts` - SQL evaluator (execution, meta commands)
- `grader-sql.ts` - Grading logic (check execution, feedback)
- `environment.ts` - Environment management (PGlite instances)
- `editor.ts` - SQL editor (CodeMirror, autocomplete)
- `sql-meta-commands.ts` - Psql-style meta commands
- `sqlUtils.ts` - Schema extraction for autocomplete

**Test documents (`docs/`)**
- `sql-test-execution.qmd` - Tests: execution, type behavior, global state
- `sql-test-exercises.qmd` - Tests: exercise behavior, setup, start over
- `sql-test-environments.qmd` - Tests: isolation, shared environments
- `sql-test-grading.qmd` - Tests: grading, check logic, `__quarto_check_context`
- `sql-test-editor.qmd` - Tests: editor, autocomplete, edit/autorun options
- `sql-test-meta.qmd` - Tests: psql-style meta commands

---

## Known limitations

- Each PGlite instance uses approximately 300 MB of browser memory. Pages with many simultaneous exercises may require significant RAM.
- `\d tablename` shows the table name but does not render structured column information.
- Start Over resets only the editor content, not the database state in shared environments.
- There is no before-all mechanism for normal SQL blocks.
- SQL exercises cannot access tables created in global SQL blocks, unlike WebR and Python exercises.

---

## License

Based on [quarto-live](https://github.com/r-wasm/quarto-live) by r-wasm (MIT License).
