/**
 * Benchmark direct functional calls vs proxies:
 * (Node 11.4.0, i5 6600k @4.4GHZ, 16GB RAM, Windows Subsystem for Linux)
 * 
 * ```
 * vanilla x 926,690,471 ops/sec ±0.86% (91 runs sampled)
 * proxied x 24,415,727 ops/sec ±1.11% (90 runs sampled)
 * Fastest is vanilla
 * ```
 */

import { Suite } from 'benchmark';

function hello(arg: string): string {
  return `Hello ${arg}`;
}

const proxy = new Proxy(hello, { apply(func, context, args) { return func.apply(context, args); } });

const suite = new Suite();

suite
  .add('vanilla', () => hello('Alex'))
  .add('proxied', () => proxy('Alex'))
  .on('cycle', (ev: any) => console.log(String(ev.target)))
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();