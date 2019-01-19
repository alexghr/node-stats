import { EventEmitter } from 'events';

export const enum StatsEventName {
  Call = 'call',
  CallResolved = 'call_resolved',
  CallRejected = 'call_rejected'
}

export interface Stats extends EventEmitter {
  addListener(event: StatsEventName.Call, listener: (id: string) => void): this;
  on(event: StatsEventName.Call, listener: (id: string) => void): this;

  addListener(event: StatsEventName.CallResolved, listener: (id: string, timeMs: number) => void): this;
  on(event: StatsEventName.CallResolved, listener: (id: string, timeMs: number) => void): this;

  addListener(event: StatsEventName.CallRejected, listener: (id: string, timeMs: number) => void): this;
  on(event: StatsEventName.CallRejected, listener: (id: string, timeMs: number) => void): this;

  addListener(event: StatsEventName, listener: (id: string) => void): this;
  on(event: StatsEventName, listener: (id: string) => void): this;
}