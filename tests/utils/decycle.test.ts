import { decycle } from "../../src/utils/decycle";

describe("utils/decycle", () => {
  it("returns primitives unchanged", () => {
    expect(decycle(42)).toBe(42);
    expect(decycle("hello")).toBe("hello");
    expect(decycle(null)).toBe(null);
    expect(decycle(undefined)).toBe(undefined);
    expect(decycle(true)).toBe(true);
  });

  it("leaves acyclic structures intact", () => {
    const input = { a: 1, b: { c: [1, 2, 3], d: "x" } };
    expect(decycle(input)).toEqual(input);
  });

  it("does not mutate the original value", () => {
    const input: Record<string, unknown> = { a: 1 };
    decycle(input);
    expect(input).toEqual({ a: 1 });
  });

  it("breaks a direct self-reference", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node: any = { type: "object" };
    node.self = node;

    const result = decycle(node);
    expect(result.type).toBe("object");
    expect(result.self).toEqual({ $ref: "#/circular" });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("breaks an indirect (ancestor) cycle", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema: any = { type: "object", properties: {} };
    schema.properties.children = { type: "array", items: schema };

    const result = decycle(schema);
    expect(result.properties.children.items).toEqual({ $ref: "#/circular" });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("preserves non-circular shared references (siblings)", () => {
    const shared = { value: 1 };
    const input = { a: shared, b: shared };

    const result = decycle(input);
    // Both siblings keep the real value; neither is replaced with a marker.
    expect(result.a).toEqual({ value: 1 });
    expect(result.b).toEqual({ value: 1 });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("handles cycles through arrays", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any[] = [];
    arr.push(arr);

    const result = decycle(arr);
    expect(result[0]).toEqual({ $ref: "#/circular" });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
