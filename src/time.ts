export type Time = () => () => number;

export const nodeHrTime: Time = () => {
  const startTs = process.hrtime();
  let value: number | undefined = undefined;

  return () => {
    if (typeof value === 'number') {
      return value;
    }

    const [deltaSec, deltaNanoSec] = process.hrtime(startTs);
    value = deltaSec * 1e3 + deltaNanoSec / 1e6;

    return value;
  };
}