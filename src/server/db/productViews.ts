import { db } from "@/drizzle/db";
import {
  countryGroupTable,
  countryTable,
  productTable,
  productViewTable,
} from "@/drizzle/schema";
import {
  CACHE_TAGS,
  dbCache,
  getGlobalTag,
  getIdTag,
  getUserTag,
} from "@/lib/cache";
import { startOfDay, subDays } from "date-fns";
import { and, count, desc, eq, gte, SQL, sql } from "drizzle-orm";
import { tz } from "@date-fns/tz";

export function getProductViewCount(userId: string, startDate: Date) {
  const cacheFn = dbCache(getProductViewCountInternal, {
    tags: [getUserTag(userId, CACHE_TAGS.productViews)],
  });
  return cacheFn(userId, startDate);
}

export async function getProductViewCountInternal(
  userId: string,
  startDate: Date
) {
  const counts = await db
    .select({ productViewsCount: count() })
    .from(productViewTable)
    .innerJoin(productTable, eq(productTable.id, productViewTable.productId))
    .where(
      and(
        eq(productTable.clerkUserId, userId),
        gte(productViewTable.viewTime, startDate)
      )
    );
  return counts[0].productViewsCount ?? 0;
}

export async function getViewsByCountryChartData({
  timezone,
  interval,
  productId,
  userId,
}: {
  timezone: string;
  interval: (typeof CHART_INTERVAL)[keyof typeof CHART_INTERVAL];
  productId?: string;
  userId: string;
}) {
  const cacheFn = dbCache(getViewsByCountryChartDataInternal, {
    tags: [
      getUserTag(userId, CACHE_TAGS.productViews),
      productId == null
        ? getUserTag(userId, CACHE_TAGS.products)
        : getIdTag(productId, CACHE_TAGS.products),
      getGlobalTag(CACHE_TAGS.countries),
    ],
  });

  return cacheFn({
    timezone,
    interval,
    productId,
    userId,
  });
}
export async function getViewsByPPPChartData({
  timezone,
  interval,
  productId,
  userId,
}: {
  timezone: string;
  interval: (typeof CHART_INTERVAL)[keyof typeof CHART_INTERVAL];
  productId?: string;
  userId: string;
}) {
  const cacheFn = dbCache(getViewsByPPPChartDataInternal, {
    tags: [
      getUserTag(userId, CACHE_TAGS.productViews),
      productId == null
        ? getUserTag(userId, CACHE_TAGS.products)
        : getIdTag(productId, CACHE_TAGS.products),
      getGlobalTag(CACHE_TAGS.countries),
      getGlobalTag(CACHE_TAGS.countryGroups),
    ],
  });

  return cacheFn({
    timezone,
    interval,
    productId,
    userId,
  });
}

export async function getViewsByDayChartData({
  timezone,
  interval,
  productId,
  userId,
}: {
  timezone: string;
  interval: (typeof CHART_INTERVAL)[keyof typeof CHART_INTERVAL];
  productId?: string;
  userId: string;
}) {
  const cacheFn = dbCache(getViewsByDayChartDataInternal, {
    tags: [
      getUserTag(userId, CACHE_TAGS.productViews),
      productId == null
        ? getUserTag(userId, CACHE_TAGS.products)
        : getIdTag(productId, CACHE_TAGS.products),
    ],
  });

  return cacheFn({
    timezone,
    interval,
    productId,
    userId,
  });
}

async function getViewsByCountryChartDataInternal({
  timezone,
  interval,
  productId,
  userId,
}: {
  timezone: string;
  interval: (typeof CHART_INTERVAL)[keyof typeof CHART_INTERVAL];
  productId?: string;
  userId: string;
}) {
  const startDate = startOfDay(interval.startDate, { in: tz(timezone) });
  const productSQ = getProductSubQuery({ userId, productId });
  return await db
    .with(productSQ)
    .select({
      views: count(productViewTable.viewTime),
      countryName: countryTable.name,
      countryCode: countryTable.code,
    })
    .from(productViewTable)
    .innerJoin(productSQ, eq(productSQ.id, productViewTable.productId))
    .innerJoin(countryTable, eq(countryTable.id, productViewTable.countryId))
    .where(
      gte(
        sql`${productViewTable.viewTime} AT TIME ZONE ${timezone}`.inlineParams(),
        startDate
      )
    )
    .groupBy(({ countryCode, countryName }) => [countryCode, countryName])
    .orderBy(({ views }) => desc(views))
    .limit(25);
}
async function getViewsByPPPChartDataInternal({
  timezone,
  interval,
  productId,
  userId,
}: {
  timezone: string;
  interval: (typeof CHART_INTERVAL)[keyof typeof CHART_INTERVAL];
  productId?: string;
  userId: string;
}) {
  const startDate = startOfDay(interval.startDate, { in: tz(timezone) });
  const productsSq = getProductSubQuery({ userId, productId });
  const productViewSq = db.$with("productViews").as(
    db
      .with(productsSq)
      .select({
        viewTime: sql`${productViewTable.viewTime} AT TIME ZONE ${timezone}`
          .inlineParams()
          .as("viewTime"),
        countryGroupId: countryTable.countryGroupId,
      })
      .from(productViewTable)
      .innerJoin(productsSq, eq(productsSq.id, productViewTable.productId))
      .innerJoin(countryTable, eq(countryTable.id, productViewTable.countryId))
      .where(({ viewTime }) => gte(viewTime, startDate))
  );

  return await db
    .with(productViewSq)
    .select({
      pppName: countryGroupTable.name,
      views: count(productViewSq.viewTime),
    })
    .from(countryGroupTable)
    .leftJoin(
      productViewSq,
      eq(productViewSq.countryGroupId, countryGroupTable.id)
    )
    .groupBy(({ pppName }) => [pppName])
    .orderBy(({ pppName }) => pppName);
}
async function getViewsByDayChartDataInternal({
  timezone,
  interval,
  productId,
  userId,
}: {
  timezone: string;
  interval: (typeof CHART_INTERVAL)[keyof typeof CHART_INTERVAL];
  productId?: string;
  userId: string;
}) {
  const productsSq = getProductSubQuery({ userId, productId });
  const productViewSq = db.$with("productViews").as(
    db
      .with(productsSq)
      .select({
        viewTime: sql`${productViewTable.viewTime} AT TIME ZONE ${timezone}`
          .inlineParams()
          .as("viewTime"),
        productId: productsSq.id,
      })
      .from(productViewTable)
      .innerJoin(productsSq, eq(productsSq.id, productViewTable.productId))
  );
  return await db
    .with(productViewSq)
    .select({
      date: interval
        .dateGrouper(sql.raw("series"))
        .mapWith((dateString) => interval.dateFormatter(new Date(dateString))),
      views: count(productViewSq.viewTime),
    })
    .from(interval.sql)
    .leftJoin(productViewSq, ({ date }) =>
      eq(interval.dateGrouper(productViewSq.viewTime), date)
    )
    .groupBy(({ date }) => [date])
    .orderBy(({ date }) => date);
}

function getProductSubQuery({
  userId,
  productId,
}: {
  userId: string;
  productId: string | undefined;
}) {
  return db.$with("products").as(
    db
      .select()
      .from(productTable)
      .where(
        and(
          eq(productTable.clerkUserId, userId),
          productId == undefined ? undefined : eq(productTable.id, productId)
        )
      )
  );
}

export const CHART_INTERVAL = {
  last7Days: {
    dateFormatter: (date: Date) => dayFormatter.format(date),
    startDate: subDays(new Date(), 7),
    label: "Last 7 Days",
    sql: sql`GENERATE_SERIES(current_date - 7, current_date, '1 day'::interval) as series`,
    dateGrouper: (col: SQL | SQL.Aliased) =>
      sql<string>`DATE(${col})`.inlineParams(),
  },
  last30Days: {
    dateFormatter: (date: Date) => dayFormatter.format(date),
    startDate: subDays(new Date(), 30),
    label: "Last 30 Days",
    sql: sql`GENERATE_SERIES(current_date - 30, current_date, '1 day'::interval) as series`,
    dateGrouper: (col: SQL | SQL.Aliased) =>
      sql<string>`DATE(${col})`.inlineParams(),
  },
  last365Days: {
    dateFormatter: (date: Date) => monthFormatter.format(date),
    startDate: subDays(new Date(), 365),
    label: "Last 365 Days",
    sql: sql`GENERATE_SERIES(DATE_TRUNC('month', current_date - 365), DATE_TRUNC('month', current_date), '1 month'::interval) as series`,
    dateGrouper: (col: SQL | SQL.Aliased) =>
      sql<string>`DATE_TRUNC('month', ${col})`.inlineParams(),
  },
};

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  year: "2-digit",
  month: "short",
  timeZone: "UTC",
});
