import { EventEmitter } from "events";
import { Time, nodeHrTime } from "./time";
import { Stats, StatsEventName } from "./stats";

type Trackable = object | AnyFunction;

export interface StatsTracker {
  trackStats<F extends Trackable = Trackable>(opts: TrackerOptions<F>): F;
  stats: Stats
}

export function createStatsTracker(): StatsTracker {
  const stats: Stats = new EventEmitter();
  const trackStats = <F extends Trackable>(opts: TrackerOptions<F>) => track(stats, opts);

  return { trackStats, stats };
}

type TrackerOptions<F extends Trackable> = { target: F, time?: Time } &
  (F extends AnyFunction ? { name?: string } : { name: string });

function track<F extends Trackable>(metrics: Stats, opts: TrackerOptions<F>): F {
  const { target, name, time = nodeHrTime } = opts;

  if (isAnyFunction(target)) {
    return trackFunctionStats(metrics, time, target, name || target.name);
  } else {
    // cache the tracking proxies we create for this object
    // so that we don't end creating a new one every time
    // the property is accessed
    const proxyCache = new WeakMap<AnyFunction, AnyFunction>();

    return new Proxy(target, {
      get(target, key) {
        const val = (target as any)[key];

        if (isAnyFunction(val)) {
          const cached = proxyCache.get(val);

          if (cached) {
            return cached;
          } else {
            const proxy = trackFunctionStats(metrics, time, val, `${name}.${String(key)}`);
            proxyCache.set(val, proxy);
            return proxy;
          }
        } else {
          return val;
        }
      }
    });
  }
}

function trackFunctionStats<F extends AnyFunction>(metrics: Stats, time: Time, func: F, name: string): F {
  const asyncEmit = (evt: StatsEventName, time?: number) => process.nextTick(() => typeof time === 'number' ? metrics.emit(evt, name, time) : metrics.emit(evt, name));

  const proxy: F = function (this: any, ...args: Parameters<F>): ReturnType<F> {
    const readTime = time();

    asyncEmit(StatsEventName.Call);

    try {
      const result: ReturnType<F> = func.apply(this, args);

      if (result && typeof result.then === 'function') {
        result.then(
          () => asyncEmit(StatsEventName.CallResolved, readTime()),
          () => asyncEmit(StatsEventName.CallRejected, readTime())
        );
      } else {
        asyncEmit(StatsEventName.CallResolved, readTime());
      }

      return result;
    } catch (err) {
      asyncEmit(StatsEventName.CallRejected, readTime());
      throw err;
    }
  } as F;

  return proxy;
}

type AnyFunction = (...args: any[]) => any;

function isAnyFunction(f: any): f is AnyFunction {
  return typeof f === 'function';
}