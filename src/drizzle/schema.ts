import { subscriptionTiers, TierNames } from "@/data/subscriptionTier";
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const productTable = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index("product.clerk_user_id_index").on(
      table.clerkUserId
    ),
  })
);

export const productRelations = relations(productTable, ({ one, many }) => ({
  productCustomizationTable: one(productCustomizationTable),
  productViews: many(productViewTable),
  countryGroupDiscounts: many(CountryGroupDiscountsTable),
}));

export const productCustomizationTable = pgTable("product_customizations", {
  id: uuid().primaryKey().defaultRandom(),
  classPrefix: text("class_prefix"),
  productId: uuid("product_id")
    .notNull()
    .references(() => productTable.id, { onDelete: "cascade" })
    .unique(),
  locationMessage: text("location_message")
    .notNull()
    .default(
      `Hey, It look likes you are from <b>{country}</b>. We support parity purchasing Power, so if you need it, use code <b>"{coupon}"</b> to get <b>{discount}%</b> off.`
    ),
  backgroundColor: text("background_color")
    .notNull()
    .default("hsl(193, 82%, 31%)"),
  textColor: text("text_color").notNull().default("hsl(0, 0%, 100%)"),
  fontSize: text("font_size").notNull().default("1rem"),
  bannerContainer: text("banner_container").notNull().default("body"),
  isSticky: boolean("is_sticky").notNull().default(true),
  createdAt,
  updatedAt,
});

export const productCustomizationtRelations = relations(
  productCustomizationTable,
  ({ one }) => ({
    product: one(productTable, {
      fields: [productCustomizationTable.productId],
      references: [productTable.id],
    }),
  })
);

export const productViewTable = pgTable("product_views", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productTable.id, { onDelete: "cascade" }),
  countryId: uuid("country_id").references(() => countryTable.id, {
    onDelete: "cascade",
  }),
  viewTime: timestamp("view_time", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productViewRelations = relations(productViewTable, ({ one }) => ({
  product: one(productTable, {
    fields: [productViewTable.productId],
    references: [productTable.id],
  }),
  countryTable: one(countryTable, {
    fields: [productViewTable.countryId],
    references: [countryTable.id],
  }),
}));

export const countryTable = pgTable("countries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  countryGroupId: uuid("country_group_id")
    .notNull()
    .references(() => countryGroupTable.id, { onDelete: "cascade" }),
  createdAt,
  updatedAt,
});

export const countryRelations = relations(countryTable, ({ one, many }) => ({
  countryGroups: one(countryGroupTable, {
    fields: [countryTable.countryGroupId],
    references: [countryGroupTable.id],
  }),
  productViews: many(productViewTable),
}));

export const countryGroupTable = pgTable("country_group", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  recommendedDiscountPercentage: real("recommended_discount_percentage"),
  createdAt,
  updatedAt,
});

export const countryGroupRelations = relations(
  countryGroupTable,
  ({ many }) => ({
    countries: many(countryTable),
    countryGroupDiscounts: many(CountryGroupDiscountsTable),
  })
);

export const CountryGroupDiscountsTable = pgTable(
  "country_group_discounts",
  {
    countryGroupId: uuid("country_group_id").references(
      () => countryGroupTable.id,
      { onDelete: "cascade" }
    ),
    productId: uuid("product_id").references(() => productTable.id, {
      onDelete: "cascade",
    }),
    coupon: text("coupon").notNull(),
    discountPercentage: real("discount_percentage").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.countryGroupId, table.productId] }),
  })
);

export const CountryGroupDiscountsRelations = relations(
  CountryGroupDiscountsTable,
  ({ one }) => ({
    product: one(productTable, {
      fields: [CountryGroupDiscountsTable.productId],
      references: [productTable.id],
    }),
    countryGroup: one(countryGroupTable, {
      fields: [CountryGroupDiscountsTable.countryGroupId],
      references: [countryGroupTable.id],
    }),
  })
);

export const TierEnum = pgEnum(
  "tier",
  Object.keys(subscriptionTiers) as [TierNames]
);

export const userSubscriptionTable = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    stripeSubscriptionitemId: text("stripe_subscription_item_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCustomerId: text("stripe_customer_id"),
    tier: TierEnum("tier").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index("user_subscriptions.clerk_user_id_index").on(
      table.clerkUserId
    ),
    stripeCustomerIdIndex: index(
      "user_subscriptions.stripe_customer_id_index"
    ).on(table.stripeCustomerId),
  })
);
