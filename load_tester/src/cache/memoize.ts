import NodeCache from "node-cache";

export const memoize = new NodeCache({
  stdTTL: 3600,
});
export const latCacheKey = "latency-array";
