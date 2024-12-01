import { db } from "@/drizzle/db";
import {
  CountryGroupDiscountsTable,
  productCustomizationTable,
  productTable,
  productViewTable,
} from "@/drizzle/schema";
import {
  CACHE_TAGS,
  dbCache,
  getGlobalTag,
  getIdTag,
  getUserTag,
  revalidateDbCache,
} from "@/lib/cache";
import { removeTrailingSlash } from "@/lib/utils";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";

export function getProductCustomization({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) {
  const cacheFn = dbCache(getProductCustomizationInternal, {
    tags: [getIdTag(productId, CACHE_TAGS.products)],
  });

  return cacheFn({ userId, productId });
}

export function getProducts(
  userId: string,
  { limit }: { limit?: number } = {}
) {
  const cacheFn = dbCache(getProductsInternal, {
    tags: [getUserTag(userId, CACHE_TAGS.products)],
  });
  return cacheFn(userId, { limit });
}
export function getProductForBanner({
  id,
  countryCode,
  url,
}: {
  id: string;
  countryCode: string;
  url: string;
}) {
  const cacheFn = dbCache(getProductForBannerInternal, {
    tags: [
      getIdTag(id, CACHE_TAGS.products),
      getGlobalTag(CACHE_TAGS.countryGroups),
      getGlobalTag(CACHE_TAGS.countries),
    ],
  });
  return cacheFn({ id, countryCode, url });
}

export function getProduct({ id, userId }: { id: string; userId: string }) {
  const cacheFn = dbCache(getProductInternal, {
    tags: [getIdTag(id, CACHE_TAGS.products)],
  });
  return cacheFn({ id, userId });
}
export function getProductCount(userId: string) {
  const cacheFn = dbCache(getProductCountInternal, {
    tags: [getUserTag(userId, CACHE_TAGS.products)],
  });
  return cacheFn(userId);
}
export async function getProductCountryGroups({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) {
  const cacheFn = dbCache(getProductCountryGroupsInternal, {
    tags: [
      getIdTag(productId, CACHE_TAGS.products),
      getGlobalTag(CACHE_TAGS.countries),
      getGlobalTag(CACHE_TAGS.countryGroups),
    ],
  });

  return cacheFn({ userId, productId });
}
export async function createProduct(data: typeof productTable.$inferInsert) {
  const [newProduct] = await db
    .insert(productTable)
    .values(data)
    .returning({ id: productTable.id, userId: productTable.clerkUserId });

  try {
    await db
      .insert(productCustomizationTable)
      .values({ productId: newProduct.id })
      .onConflictDoNothing({ target: productCustomizationTable.productId });
  } catch (error) {
    await db.delete(productTable).where(eq(productTable.id, newProduct.id));
    console.log(error);
  }

  revalidateDbCache({
    tag: CACHE_TAGS.products,
    userId: newProduct.userId,
    id: newProduct.id,
  });

  return newProduct;
}

export async function updateProduct(
  data: Partial<typeof productTable.$inferInsert>,
  { userId, id }: { userId: string; id: string }
) {
  const { rowCount } = await db
    .update(productTable)
    .set(data)
    .where(and(eq(productTable.id, id), eq(productTable.clerkUserId, userId)));
  if (rowCount > 0) {
    revalidateDbCache({
      tag: CACHE_TAGS.products,
      userId: userId,
      id: id,
    });
  }
  return rowCount > 0;
}

export async function deleteProduct({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const { rowCount } = await db
    .delete(productTable)
    .where(and(eq(productTable.id, id), eq(productTable.clerkUserId, userId)));

  revalidateDbCache({
    tag: CACHE_TAGS.products,
    userId: userId,
    id: id,
  });

  return rowCount > 0;
}

export async function updateCountryDiscounts({
  deleteGroup,
  insert,
  productId,
  userId,
}: {
  deleteGroup: { countryGroupId: string }[];
  insert: (typeof CountryGroupDiscountsTable.$inferInsert)[];
  productId: string;
  userId: string;
}) {
  const product = await getProduct({ id: productId, userId });
  if (product == null) return false;

  const statements: BatchItem<"pg">[] = [];
  if (deleteGroup.length > 0) {
    statements.push(
      db.delete(CountryGroupDiscountsTable).where(
        and(
          eq(CountryGroupDiscountsTable.productId, productId),
          inArray(
            CountryGroupDiscountsTable.countryGroupId,
            deleteGroup.map((group) => group.countryGroupId)
          )
        )
      )
    );
  }

  if (insert.length > 0) {
    statements.push(
      db
        .insert(CountryGroupDiscountsTable)
        .values(insert)
        .onConflictDoUpdate({
          target: [
            CountryGroupDiscountsTable.productId,
            CountryGroupDiscountsTable.countryGroupId,
          ],
          set: {
            coupon: sql.raw(
              `excluded.${CountryGroupDiscountsTable.coupon.name}`
            ),
            discountPercentage: sql.raw(
              `excluded.${CountryGroupDiscountsTable.discountPercentage.name}`
            ),
          },
        })
    );
  }
  if (statements.length > 0) {
    await db.batch(statements as [BatchItem<"pg">]);
  }
  revalidateDbCache({
    tag: CACHE_TAGS.products,
    userId,
    id: productId,
  });
}

export async function updateProductCustomization(
  data: Partial<typeof productCustomizationTable.$inferInsert>,
  { userId, productId }: { userId: string; productId: string }
) {
  const product = await getProduct({ id: productId, userId });
  if (product == null) return;
  await db
    .update(productCustomizationTable)
    .set(data)
    .where(eq(productCustomizationTable.productId, productId));

  revalidateDbCache({
    tag: CACHE_TAGS.products,
    userId,
    id: productId,
  });
}

function getProductsInternal(userId: string, { limit }: { limit?: number }) {
  return db.query.productTable.findMany({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    orderBy: ({ createdAt }, { desc }) => desc(createdAt),
    limit: limit,
  });
}

function getProductInternal({ id, userId }: { id: string; userId: string }) {
  return db.query.productTable.findFirst({
    where: ({ clerkUserId, id: productId }, { eq, and }) =>
      and(eq(productId, id), eq(clerkUserId, userId)),
  });
}

async function getProductCountryGroupsInternal({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) {
  const product = await getProduct({ id: productId, userId });
  if (product == null) return [];

  const data = await db.query.countryGroupTable.findMany({
    with: {
      countries: {
        columns: {
          code: true,
          name: true,
        },
      },
      countryGroupDiscounts: {
        columns: {
          coupon: true,
          discountPercentage: true,
        },
        where: ({ productId: id }, { eq }) => eq(id, productId),
        limit: 1,
      },
    },
  });
  return data.map((group) => {
    return {
      id: group.id,
      name: group.name,
      recommendedDiscountPercentage: group.recommendedDiscountPercentage,
      countries: group.countries,
      discount: group.countryGroupDiscounts.at(0),
    };
  });
}

async function getProductCustomizationInternal({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) {
  const data = await db.query.productTable.findFirst({
    where: ({ id, clerkUserId }, { and, eq }) =>
      and(eq(id, productId), eq(clerkUserId, userId)),
    with: {
      productCustomizationTable: true,
    },
  });

  return data?.productCustomizationTable;
}
async function getProductCountInternal(userId: string) {
  const counts = await db
    .select({ productCount: count() })
    .from(productTable)
    .where(eq(productTable.clerkUserId, userId));

  return counts[0].productCount ?? 0;
}

async function getProductForBannerInternal({
  id,
  countryCode,
  url,
}: {
  id: string;
  countryCode: string;
  url: string;
}) {
  const data = await db.query.productTable.findFirst({
    where: ({ id: idCol, url: urlCol }, { eq, and }) =>
      and(eq(idCol, id), eq(urlCol, removeTrailingSlash(url))),
    columns: {
      id: true,
      clerkUserId: true,
    },
    with: {
      productCustomizationTable: true,
      countryGroupDiscounts: {
        columns: {
          coupon: true,
          discountPercentage: true,
        },
        with: {
          countryGroup: {
            columns: {},
            with: {
              countries: {
                columns: {
                  id: true,
                  name: true,
                },
                limit: 1,
                where: ({ code }, { eq }) => eq(code, countryCode),
              },
            },
          },
        },
      },
    },
  });
  const discounts = data?.countryGroupDiscounts.find((discount) => {
    if (discount.countryGroup == null) return;
    return discount.countryGroup?.countries.length > 0;
  });
  const country = discounts?.countryGroup?.countries[0];
  const product =
    data?.productCustomizationTable == null || data == null
      ? undefined
      : {
          id: data.id,
          clerkUserId: data.clerkUserId,
          customization: data.productCustomizationTable,
        };

  return {
    product,
    discount:
      discounts == null
        ? undefined
        : {
            coupon: discounts.coupon,
            percentage: discounts.discountPercentage,
          },
    country,
  };
}
export async function createProductView({
  productId,
  countryId,
  userId,
}: {
  productId: string;
  countryId: string | undefined;
  userId: string;
}) {
  const [newRow] = await db
    .insert(productViewTable)
    .values({
      productId,
      countryId,
      viewTime: new Date(),
    })
    .returning({ id: productViewTable.id });
  if (newRow != null) {
    revalidateDbCache({ tag: CACHE_TAGS.productViews, userId, id: newRow.id });
  }
}
