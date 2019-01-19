import { StatsD } from 'node-statsd';
import { createStatsTracker } from './tracker';
import { EventName } from './metrics';

const statsd = new StatsD({
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
      }, Math.random() * 480 + 20);
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

const { trackStats, stats } = createStatsTracker();
const cache = trackStats({ target: new MyCache(), name: 'default_cache' });

stats.on(EventName.Call, (name) => statsd.increment(name));
stats.on(EventName.CallResolved, (name, time) => statsd.timing(name, time));
stats.on(EventName.CallRejected, (name, time) => statsd.timing(name, time));

export default cache;
