import { describe, expect, it } from "vitest";
import { asSchema } from "@ai-sdk/provider-utils";
import { aiSpecDocumentSchema, specDocumentSchema } from "@/lib/spec/schema";
import { validateStrictSchema } from "@/lib/spec/schema-validator";

// Convert Zod → JSON Schema the same way Output.object() does
function toJsonSchema(schema: Parameters<typeof asSchema>[0]) {
  return asSchema(schema).jsonSchema as Record<string, unknown>;
}

describe("aiSpecDocumentSchema — OpenAI strict mode compatibility", () => {
  it("every property in brief is in required (userEditedFields included)", () => {
    const json = toJsonSchema(aiSpecDocumentSchema) as {
      properties: { brief: { required: string[]; properties: Record<string, unknown> } };
    };
    const brief = json.properties.brief;
    const keys = Object.keys(brief.properties);
    for (const key of keys) {
      expect(brief.required, `brief.required missing "${key}"`).toContain(key);
    }
    expect(brief.required).toContain("userEditedFields");
  });

  it("root schema has all top-level fields in required", () => {
    const json = toJsonSchema(aiSpecDocumentSchema) as {
      required: string[];
      properties: Record<string, unknown>;
    };
    const keys = Object.keys(json.properties);
    for (const key of keys) {
      expect(json.required, `root required missing "${key}"`).toContain(key);
    }
  });

  it("passes validateStrictSchema with no errors", () => {
    const json = toJsonSchema(aiSpecDocumentSchema);
    const errors = validateStrictSchema(json);
    expect(errors).toHaveLength(0);
  });

  it("does not include figmaMapping or suppressedTaskKeys (added by compiler)", () => {
    const json = toJsonSchema(aiSpecDocumentSchema) as {
      properties: Record<string, unknown>;
    };
    expect(json.properties).not.toHaveProperty("figmaMapping");
    expect(json.properties).not.toHaveProperty("suppressedTaskKeys");
  });
});

describe("specDocumentSchema — runtime parsing fallbacks", () => {
  it("parses document with missing userEditedFields using .catch([]) fallback", () => {
    const minimal = {
      brief: {
        title: "t", purpose: "p", problem: "pr",
        successCriteria: [], audience: [], scope: [],
        outOfScope: [], constraints: [],
        // userEditedFields intentionally omitted
      },
      requirements: [], questions: [], roles: [], permissions: [],
      screens: [], states: [], uxCopy: [], tasks: [],
      suppressedTaskKeys: [],
      dailyReport: { date: "2026-01-01", summary: "", completed: [], next: [], blockers: [] },
    };
    const result = specDocumentSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brief.userEditedFields).toEqual([]);
    }
  });
});
