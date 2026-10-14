// A tiny stand-in for the parts of vitest the tests use, so they run with no extra packages.
const tests = [];
const prefix = [];
export const describe = (name, fn) => {
  prefix.push(name);
  fn();
  prefix.pop();
};
export const it = (name, fn) => {
  tests.push({ name: [...prefix, name].join(" > "), fn });
};
const show = (v) => JSON.stringify(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const expect = (actual) => {
  const make = (negate) => {
    const check = (ok, message) => {
      if (negate ? ok : !ok) throw new Error(`${negate ? "not " : ""}${message}`);
    };
    return {
      toBe: (b) => check(Object.is(actual, b), `expected ${show(actual)} toBe ${show(b)}`),
      toEqual: (b) => check(same(actual, b), `expected ${show(actual)} toEqual ${show(b)}`),
      toBeNull: () => check(actual === null, `expected ${show(actual)} to be null`),
      toBeCloseTo: (b, digits = 2) => check(Math.abs(actual - b) < Math.pow(10, -digits) / 2, `expected ${actual} close to ${b}`),
      toBeGreaterThan: (b) => check(actual > b, `expected ${actual} > ${b}`),
      toBeGreaterThanOrEqual: (b) => check(actual >= b, `expected ${actual} >= ${b}`),
      toBeLessThanOrEqual: (b) => check(actual <= b, `expected ${actual} <= ${b}`),
      toMatch: (re) => check(re.test(actual), `expected ${actual} to match ${re}`),
    };
  };
  const api = make(false);
  api.not = make(true);
  return api;
};

export async function runAll() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ok    ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL  ${t.name}\n        ${e.message}`);
    }
  }
  console.log(`\n${tests.length - failed} of ${tests.length} tests passed`);
  return failed;
}
