import 'jest';

import { createStatsTracker, StatsTracker } from './tracker';
import { StatsEventName } from './stats';

const TIMEOUT = 100;

describe('tracker', () => {
  let tracker: StatsTracker;

  beforeEach(() => {
    jest.clearAllMocks();

    tracker = createStatsTracker();
  });

  describe('can track functions', () => {
    const sync = jest.fn().mockName('sync').mockReturnValue(undefined);
    const async = jest.fn().mockName('async').mockResolvedValue(undefined)

    it.each([sync, async])('emits a `Call` event whenever the target function is called', (func: jest.Mock, done) => {
      expect.assertions(2);
      const CALL_NUM = 10;
      const callback = jest.fn();

      const proxy = tracker.trackStats({ target: func });
      tracker.stats.on(StatsEventName.Call, callback);

      for (let i = 0; i < CALL_NUM; ++i) {
        proxy();
      }

      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(CALL_NUM);
        expect(callback).toHaveBeenCalledWith(func.name);
        done();
      }, TIMEOUT);
    });

    it('emits a `CallResolved` event after the function finished (sync)', (done) => {
      expect.assertions(1);
      // track when `sync` returns
      let time: number;

      const proxy = tracker.trackStats({ target: sync });
      tracker.stats.on(StatsEventName.CallResolved, () => {
        // CallResolved needs to be called after `time` (or at the very least on the same millisecond)
        expect(Date.now()).toBeGreaterThanOrEqual(time);
      });

      proxy();
      time = Date.now();

      setTimeout(done, TIMEOUT);
    });

    it('emits a `CallResolved` event after the function\'s return promise is resolved (async)', (done) => {
      expect.assertions(1);
      // track when `func`'s return value is resolved
      let time: number;

      const proxy = tracker.trackStats({ target: async });
      tracker.stats.on(StatsEventName.CallResolved, () => {
        // CallResolved needs to be called after `time` (or at the very least on the same millisecond)
        expect(Date.now()).toBeGreaterThanOrEqual(time);
      });

      const result = proxy();
      result.then(() => time = Date.now());

      setTimeout(done, TIMEOUT);
    });

    it.each([sync, async])('tracks how long the target function takes to run', (func: jest.Mock, done) => {
      testTime(func, StatsEventName.CallResolved, done);
    });

    it.each([sync, async])('emits a `CallRejected` event if the function throws an error', (func: jest.Mock, done) => {
      expect.assertions(1);
      const callback = jest.fn();

      func.mockImplementationOnce(() => { throw new Error() });

      const proxy = tracker.trackStats({ target: func });
      tracker.stats.on(StatsEventName.CallRejected, callback);

      try {
        proxy();
      } catch { }

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        done();
      }, TIMEOUT);
    });

    it('emits a `CallRejected` event if the function\'s returned Promise is rejected', (done) => {
      expect.assertions(1);
      const callback = jest.fn();

      async.mockRejectedValueOnce(new Error('test'));

      const proxy = tracker.trackStats({ target: async });
      tracker.stats.on(StatsEventName.CallRejected, callback);

      proxy();

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        done();
      }, TIMEOUT);
    });

    it.each([sync, async])('tracks how long the target function before it throws', (func: jest.Mock, done) => {
      func.mockImplementationOnce(() => { throw new Error('foo') })
      testTime(func, StatsEventName.CallRejected, done);
    });

    it('tracks how long the target function before it\'s promise is rejected', (done) => {
      async.mockRejectedValueOnce(new Error('test'));
      testTime(async, StatsEventName.CallRejected, done);
    });

    function testTime(func: (...args: any[]) => any, eventName: StatsEventName, done: Function) {
      expect.assertions(1);
      const callback = jest.fn();

      const proxy = tracker.trackStats({ target: func });
      tracker.stats.on(eventName, callback);

      try {
        proxy();
      } catch { }

      setTimeout(() => {
        expect(callback.mock.calls[0][1]).toBeGreaterThan(0);
        done();
      }, TIMEOUT);
    }

  });

  describe('can track function properties on objects', () => {
    it('does not change properties which are not functions', (done) => {
      expect.assertions(4);

      const callCb = jest.fn();
      const resolvedCb = jest.fn();
      const rejectedCb = jest.fn();

      tracker.stats.on(StatsEventName.Call, callCb);
      tracker.stats.on(StatsEventName.CallResolved, resolvedCb);
      tracker.stats.on(StatsEventName.CallRejected, rejectedCb);

      const proxy = tracker.trackStats({ target: { foo: 'foo prop' }, name: 'test' });

      expect(proxy.foo).toBe('foo prop');
      setTimeout(() => {
        expect(callCb).not.toHaveBeenCalled();
        expect(resolvedCb).not.toHaveBeenCalled();
        expect(rejectedCb).not.toHaveBeenCalled();

        done();
      }, TIMEOUT);
    });

    it('does create proxies for properties which are functions', (done) => {
      expect.assertions(4);
      const callCb = jest.fn();
      const resolvedCb = jest.fn();
      const rejectedCb = jest.fn();

      tracker.stats.on(StatsEventName.Call, callCb);
      tracker.stats.on(StatsEventName.CallResolved, resolvedCb);
      tracker.stats.on(StatsEventName.CallRejected, rejectedCb);

      const proxy = tracker.trackStats({ target: { foo() { return 'foo'; }, }, name: 'test' });

      expect(typeof proxy.foo).toBe('function');
      proxy.foo();

      setTimeout(() => {
        expect(callCb).toHaveBeenCalledWith('test.foo');
        expect(resolvedCb).toHaveBeenCalledWith('test.foo', expect.any(Number));
        expect(rejectedCb).not.toHaveBeenCalled();

        done();
      }, TIMEOUT);
    });
  });
});
