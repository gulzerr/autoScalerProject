import NodeCache from "node-cache";

export const memoize = new NodeCache({
  stdTTL: 3600,
});
export const cacheKey = "latency-array";
export const chunkSizeCacheKey = "chunk-size";
