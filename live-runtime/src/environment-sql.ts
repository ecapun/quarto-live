export class SqlEnvironment {
  name: string;

  constructor(name = "global") {
    this.name = name;
  }
}