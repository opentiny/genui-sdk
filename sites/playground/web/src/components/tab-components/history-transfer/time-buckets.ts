import { t } from '../../../i18n';

export enum TimeBucketKey {
  Today = 'today',
  Yesterday = 'yesterday',
  TwoDaysAgo = 'twoDaysAgo',
  AWeekAgo = 'aWeekAgo',
  AMonthAgo = 'aMonthAgo',
};

export type TimeBucketLabel = (typeof TimeBucketKey)[keyof typeof TimeBucketKey];

export const TIME_BUCKET_LABELS = [
  TimeBucketKey.Today,
  TimeBucketKey.Yesterday,
  TimeBucketKey.TwoDaysAgo,
  TimeBucketKey.AWeekAgo,
  TimeBucketKey.AMonthAgo,
] as const satisfies readonly TimeBucketLabel[];

export const getTimeBucketDisplayLabel = (label: TimeBucketLabel): string =>
  t(`history.timeBucket.${label}`);

const MS_PER_DAY = 86400000;

export const startOfLocalDay = (timeMs: number) => {
  const d = new Date(timeMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const calendarDayDiffFromToday = (createdAtMs: number, nowMs: number) => {
  const todayStart = startOfLocalDay(nowMs);
  const dayStart = startOfLocalDay(createdAtMs);
  return Math.round((todayStart - dayStart) / MS_PER_DAY);
};

/**
 * 按本地日历日，根据 `createdAt` 归入时间桶。
 * 无合法 `createdAt` 时归入 一个月之前。
 */
export const timeBucketLabelForCreatedAt = (createdAt: unknown, nowMs: number = Date.now()): TimeBucketLabel => {
  if (typeof createdAt !== 'number' || Number.isNaN(createdAt)) {
    return TimeBucketKey.AMonthAgo;
  }

  const dayDiff = calendarDayDiffFromToday(createdAt, nowMs);
  if (dayDiff <= 0) {
    return TimeBucketKey.Today;
  }
  if (dayDiff === 1) {
    return TimeBucketKey.Yesterday;
  }
  if (dayDiff === 2) {
    return TimeBucketKey.TwoDaysAgo;
  }
  if (dayDiff < 7) {
    return TimeBucketKey.AWeekAgo;
  }
  return TimeBucketKey.AMonthAgo;
};

type WithCreatedAt = { createdAt?: unknown };

const emptyBuckets = <T>(): Record<TimeBucketLabel, T[]> =>
  Object.fromEntries(TIME_BUCKET_LABELS.map((label) => [label, []])) as Record<TimeBucketLabel, T[]>;

/**
 * 将会话或模板等列表按时间桶拆分；仅返回非空分组。
 * 组内顺序与入参 `items` 的遍历顺序一致。
 */
export const groupByTimeBuckets = <T extends WithCreatedAt>(
  items: readonly T[],
  options?: { nowMs?: number },
): Array<{ group: string; items: T[] }> => {
  const nowMs = options?.nowMs ?? Date.now();
  const buckets = emptyBuckets<T>();

  for (const item of items) {
    buckets[timeBucketLabelForCreatedAt(item.createdAt, nowMs)].push(item);
  }

  return TIME_BUCKET_LABELS.filter((label) => buckets[label].length > 0).map((label) => ({
    group: getTimeBucketDisplayLabel(label),
    items: [...buckets[label]],
  }));
};
