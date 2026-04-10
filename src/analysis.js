export function analyzeRecords(records) {
  if (!Array.isArray(records)) {
    throw new Error("Expected records to be an array");
  }

  const count = records.length;
  const numericFields = {};

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "number") {
        numericFields[key] = numericFields[key] || {
          sum: 0,
          count: 0,
          min: Infinity,
          max: -Infinity,
        };
        numericFields[key].sum += value;
        numericFields[key].count += 1;
        numericFields[key].min = Math.min(numericFields[key].min, value);
        numericFields[key].max = Math.max(numericFields[key].max, value);
      }
    }
  }

  const numericSummary = Object.fromEntries(
    Object.entries(numericFields).map(([field, stats]) => [
      field,
      {
        average: stats.count ? stats.sum / stats.count : 0,
        min: stats.min === Infinity ? null : stats.min,
        max: stats.max === -Infinity ? null : stats.max,
        count: stats.count,
      },
    ]),
  );

  return {
    count,
    numericSummary,
  };
}
