import { randomBytes } from 'crypto';
import { StatsD } from 'node-statsd';

const metrics = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'test.'
});

class MyCache {
  readonly cache = new Map<string, { val: object, exp?: number }>();

  constructor() { }

  async set(key: string, val: object, ttl?: number): Promise<void> {
    return new Promise<void>((res, rej) => {
      setTimeout(() => {
        this.cache.set(key, { val, exp: ttl ? Date.now() + ttl : undefined });
        res(undefined);
      }, Math.random() * 1000);
    });
  }

  async get(key: string): Promise<object | undefined> {
    return new Promise<object | undefined>((res, rej) => {
      setTimeout(() => {
        const hit = this.cache.get(key);
        if (hit) {
          if (hit.exp && hit.exp < Date.now()) {
            res(undefined)
          } else {
            res(hit.val);
          }
        }
        res(undefined);
      }, Math.random() * 1000);
    });
  }
}

function makeTrackingProxy<T extends Object | Function>(obj: T, prefix: string): T {
  return new Proxy(obj, {
    get(target, name) {
      const val = (target as any)[name];
      return typeof val === 'function' ? makeTrackingProxy(val, prefix) : val;
    },

    async apply(func, target, args) {
      if (typeof func !== 'function') {
        throw new Error('not a function');
      }


      const stat = `${prefix}.func.${func.name}`;
      metrics.increment(stat);
      const start = Date.now();
      try {
        return await func.apply(target, args);
      } catch (err) {
        metrics.increment(`${stat}.error`);
        throw err;
      } finally {
        metrics.timing(`${stat}.time`, Date.now() - start);
      }
    }
  });
}

const cache = makeTrackingProxy(new MyCache(), 'default_cache');
export default cache;
