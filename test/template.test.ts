import { describe, it, expect } from "vitest";
import { substituteTemplateArgs } from "../src/utils/template.js";

describe("substituteTemplateArgs", () => {
  it("replaces template variables", () => {
    const result = substituteTemplateArgs(
      ["-p", "{{prompt}}", "--tools", "{{tools}}"],
      { prompt: "hello world", tools: "Read,Write" }
    );
    expect(result).toEqual(["-p", "hello world", "--tools", "Read,Write"]);
  });

  it("replaces missing variables with empty string", () => {
    const result = substituteTemplateArgs(["{{missing}}"], {});
    expect(result).toEqual([""]);
  });

  it("handles args with no templates", () => {
    const result = substituteTemplateArgs(["--flag", "value"], { prompt: "x" });
    expect(result).toEqual(["--flag", "value"]);
  });

  it("handles multiple templates in one arg", () => {
    const result = substituteTemplateArgs(["{{a}}-{{b}}"], {
      a: "foo",
      b: "bar",
    });
    expect(result).toEqual(["foo-bar"]);
  });
});
