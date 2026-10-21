/**
 * While a shared project is open for viewing, the show data (diagram, lists) comes from the link
 * and nothing is written to this browser. This holds it, with no imports so anything can read it.
 */
let data: unknown = null;

export const getViewShow = <T = unknown>(): T | null => data as T | null;
export const setViewShow = (v: unknown) => {
  data = v;
};
