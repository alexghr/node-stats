# stats

Track your functions in style!

## Example

```js
const { createStatsTracker } = require('@alexghr/stats');
const { trackStats, stats } = createStatsTracker();

// Setup stats collection
stats.on('call', (name) => console.log(`${name} was called`));
stats.on('call_resolved', (name, time) => console.log(`${name} took ${time}ms to run`));
stats.on('call_rejected', (name, time) => console.log(`Oh no! ${name} crashed after ${time}ms`));

class AwesomeService {
  doWork() {
    return new Promise((resolve, reject) => {
      console.log('working on something important....');
      setTimeout(() => resolve(42), 1000);
    });
  }
}

// this an example of tracking all of the functions on an object
// but it works in the same way when `target` is just a function
const service = trackStats({ target: new AwesomeService(), name: 'awesome_service' });
service.doWork().then((result) => console.log(`result is: ${result}`));

// Prints:
// working on something important....
// awesome_service.doWork was called
// result is: 42
// awesome_service.doWork took 1003.0209ms to run
```

You can easily connect it to metrics-collecting services. Here's an example using it with `node-statsd`:

```js
const { createStatsTracker } = require('@alexghr/stats');
// push stats into a StatsD server
const StatsD = require('node-statsd');

const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'example.'
});

const { trackStats, stats } = createStatsTracker();

stats.on('call', (name) => statsd.increment(name));
stats.on('call_resolved', (name, time) => statsd.timing(name, time));
stats.on('call_rejected', (name, time) => {
  statsd.increment(`${name}.error`);
  statsd.timing(`${name}.error`, time);
});
```