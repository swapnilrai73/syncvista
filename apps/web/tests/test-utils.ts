/**
 * Vitest-compatible test framework utilities for apps/web.
 * Provides describe, it, test, expect with deep assertions,
 * allowing unit tests to run directly via tsx/node or via vitest runner.
 */

type TestFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void) {
  const suite: TestSuite = { name, tests: [] };
  const prevSuite = currentSuite;
  currentSuite = suite;
  suites.push(suite);
  fn();
  currentSuite = prevSuite;
}

export function it(name: string, fn: TestFn) {
  if (currentSuite) {
    currentSuite.tests.push({ name, fn });
  } else {
    describe("Default Suite", () => {
      currentSuite!.tests.push({ name, fn });
    });
  }
}

export const test = it;

export function expect<T>(actual: T) {
  const matchers = (isNot: boolean) => ({
    toBe(expected: any) {
      const pass = Object.is(actual, expected);
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected NOT ${JSON.stringify(expected)}, but got it`
            : `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`
        );
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      const pass = a === b;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected values to NOT be deeply equal`
            : `Expected deep equality:\nExpected: ${b}\nActual:   ${a}`
        );
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      if (typeof actual !== "number") {
        throw new Error(`Expected a number, but got ${typeof actual}`);
      }
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      const pass = diff <= tolerance;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected ${actual} to NOT be close to ${expected}`
            : `Expected ${actual} to be close to ${expected} (diff: ${diff}, tolerance: ${tolerance})`
        );
      }
    },
    toBeGreaterThan(expected: number) {
      const pass = typeof actual === "number" && actual > expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected ${actual} to NOT be greater than ${expected}`
            : `Expected ${actual} to be greater than ${expected}`
        );
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      const pass = typeof actual === "number" && actual >= expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected ${actual} to NOT be >= ${expected}`
            : `Expected ${actual} to be >= ${expected}`
        );
      }
    },
    toBeLessThan(expected: number) {
      const pass = typeof actual === "number" && actual < expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected ${actual} to NOT be less than ${expected}`
            : `Expected ${actual} to be less than ${expected}`
        );
      }
    },
    toBeLessThanOrEqual(expected: number) {
      const pass = typeof actual === "number" && actual <= expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected ${actual} to NOT be <= ${expected}`
            : `Expected ${actual} to be <= ${expected}`
        );
      }
    },
    toBeDefined() {
      const pass = actual !== undefined;
      if (isNot ? pass : !pass) {
        throw new Error(isNot ? `Expected value to be undefined` : `Expected value to be defined`);
      }
    },
    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new Error(isNot ? `Expected value to be defined` : `Expected undefined`);
      }
    },
    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new Error(isNot ? `Expected falsy value` : `Expected truthy value`);
      }
    },
    toBeFalsy() {
      const pass = !Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new Error(isNot ? `Expected truthy value` : `Expected falsy value`);
      }
    },
    toContain(item: any) {
      let pass = false;
      if (Array.isArray(actual) && actual.includes(item)) pass = true;
      else if (typeof actual === "string" && actual.includes(String(item))) pass = true;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected collection to NOT contain ${JSON.stringify(item)}`
            : `Expected collection to contain ${JSON.stringify(item)}`
        );
      }
    },
    toMatch(regex: RegExp) {
      const str = String(actual);
      const pass = regex.test(str);
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected "${str}" NOT to match pattern ${regex}`
            : `Expected "${str}" to match pattern ${regex}`
        );
      }
    },
    toHaveLength(expectedLen: number) {
      const len = (actual as any)?.length;
      const pass = len === expectedLen;
      if (isNot ? pass : !pass) {
        throw new Error(
          isNot
            ? `Expected length NOT to be ${expectedLen}`
            : `Expected length to be ${expectedLen}, but got ${len}`
        );
      }
    },
    toThrow(expectedMessage?: string | RegExp) {
      if (typeof actual !== "function") {
        throw new Error(`Expected a function to test for throws, got ${typeof actual}`);
      }
      let threw = false;
      let errorObj: any;
      try {
        (actual as any)();
      } catch (err: any) {
        threw = true;
        errorObj = err;
      }
      if (isNot ? threw : !threw) {
        throw new Error(
          isNot
            ? `Expected function NOT to throw, but it threw: ${errorObj?.message}`
            : `Expected function to throw, but it executed without error`
        );
      }
      if (expectedMessage && threw && !isNot) {
        const msg = errorObj?.message || String(errorObj);
        if (expectedMessage instanceof RegExp) {
          if (!expectedMessage.test(msg)) {
            throw new Error(`Expected error message to match ${expectedMessage}, got "${msg}"`);
          }
        } else if (!msg.includes(expectedMessage)) {
          throw new Error(`Expected error message to contain "${expectedMessage}", got "${msg}"`);
        }
      }
    },
  });

  return {
    ...matchers(false),
    not: matchers(true),
  };
}

export async function runSuites(): Promise<{ total: number; passed: number; failed: number }> {
  let total = 0;
  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    console.log(`\n\x1b[1m\x1b[36m${suite.name}\x1b[0m`);
    for (const testCase of suite.tests) {
      total++;
      try {
        await testCase.fn();
        passed++;
        console.log(`  \x1b[32m✔\x1b[0m ${testCase.name}`);
      } catch (err: any) {
        failed++;
        console.log(`  \x1b[31m✖\x1b[0m ${testCase.name}`);
        console.log(`    \x1b[31m${err.message || err}\x1b[0m`);
        if (err.stack) {
          const lines = err.stack.split("\n").slice(1, 4).join("\n");
          console.log(`    \x1b[90m${lines}\x1b[0m`);
        }
      }
    }
  }

  // Clear suites after run so consecutive calls don't duplicate
  suites.length = 0;

  return { total, passed, failed };
}
