import { subscriptionTiers } from "@/data/subscriptionTier";
import { db } from "@/drizzle/db";
import { userSubscriptionTable } from "@/drizzle/schema";
import {
  CACHE_TAGS,
  dbCache,
  revalidateDbCache,
  getUserTag,
} from "@/lib/cache";
import { SQL } from "drizzle-orm";

export async function createUserSubscription(
  data: typeof userSubscriptionTable.$inferInsert
) {
  const [newSubscription] = await db
    .insert(userSubscriptionTable)
    .values(data)
    .onConflictDoNothing({ target: userSubscriptionTable.clerkUserId })
    .returning({
      id: userSubscriptionTable.id,
      userId: userSubscriptionTable.clerkUserId,
    });

  if (newSubscription != null) {
    revalidateDbCache({
      tag: CACHE_TAGS.subscription,
      id: newSubscription.id,
      userId: newSubscription.userId,
    });
  }
  return newSubscription;
}

export function getUserSubscription(userId: string) {
  const cacheFn = dbCache(getUserSubscriptionInternal, {
    tags: [getUserTag(userId, CACHE_TAGS.subscription)],
  });

  return cacheFn(userId);
}

export async function updateUserSubscription(
  where: SQL,
  data: Partial<typeof userSubscriptionTable.$inferInsert>
) {
  const [updatedSubscription] = await db
    .update(userSubscriptionTable)
    .set(data)
    .where(where)
    .returning({
      id: userSubscriptionTable.id,
      userId: userSubscriptionTable.clerkUserId,
    });
  if (updatedSubscription != null) {
    revalidateDbCache({
      tag: CACHE_TAGS.subscription,
      userId: updatedSubscription.userId,
      id: updatedSubscription.id,
    });
  }
}

export async function getUserSubscriptionTier(userId: string) {
  const subscription = await getUserSubscription(userId);
  if (subscription == null) throw new Error("User has no subscription");
  return subscriptionTiers[subscription.tier];
}

function getUserSubscriptionInternal(userId: string) {
  return db.query.userSubscriptionTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
  });
}
