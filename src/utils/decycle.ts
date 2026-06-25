/**
 * Removes circular references from a value so it can be safely serialized with
 * `JSON.stringify`.
 *
 * Recursive Swagger/OpenAPI schemas (e.g. a schema whose `items` points back to
 * itself) become real circular JavaScript object references once
 * `SwaggerParser.validate()` dereferences their `$ref` pointers. Serializing
 * those objects throws "Converting circular structure to JSON".
 *
 * This walks the structure and replaces any node that points back to one of its
 * own ancestors with a `{ $ref: "#/circular" }` marker. Non-circular shared
 * references are preserved (duplicated in the output), so only genuine cycles
 * are broken. The original value is never mutated.
 */
export function decycle<T>(value: T): T {
  const ancestors = new Set<object>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function recurse(node: any): any {
    if (node === null || typeof node !== "object") {
      return node;
    }

    if (ancestors.has(node)) {
      return { $ref: "#/circular" };
    }

    ancestors.add(node);

    let result: unknown;
    if (Array.isArray(node)) {
      result = node.map(recurse);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: Record<string, any> = {};
      for (const key of Object.keys(node)) {
        obj[key] = recurse(node[key]);
      }
      result = obj;
    }

    ancestors.delete(node);
    return result;
  }

  return recurse(value) as T;
}
