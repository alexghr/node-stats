/**
 * Benchmark direct functional calls vs proxies:
 * (Node 11.4.0, i5 6600k @4.4GHZ, 16GB RAM, Windows Subsystem for Linux)
 * 
 * ```
 
direct call x 946,283,000 ops/sec ±0.25% (96 runs sampled)
function wrap x 949,800,396 ops/sec ±0.29% (94 runs sampled)
apply trap x 24,834,167 ops/sec ±0.54% (88 runs sampled)
apply trap (no context) x 31,196,421 ops/sec ±0.89% (89 runs sampled)
no traps x 33,908,231 ops/sec ±0.39% (93 runs sampled)
Fastest is function wrap

 * ```
 * 
 * Also see http://thecodebarbarian.com/thoughts-on-es6-proxies-performance
 */

import { Suite } from 'benchmark';

function hello(arg: string): string {
  return `Hello ${arg}`;
}

const applyTrap = new Proxy(hello, { apply(func, context, args) { return func.apply(context, args); } });
const noTraps = new Proxy(hello, {});
const wrap = (arg: string) => hello(arg);
const applyTrapNoContext = new Proxy(hello, {
  apply(func, context, args: Parameters<typeof hello>) {
    return func(args[0]);
  }
});

const suite = new Suite();

suite
  .add('direct call', () => hello('Alex'))
  .add('function wrap', () => wrap('Alex'))
  .add('apply trap', () => applyTrap('Alex'))
  .add('apply trap (no context)', () => applyTrapNoContext('Alex'))
  .add('no traps', () => noTraps('Alex'))
  .on('cycle', (ev: any) => console.log(String(ev.target)))
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();