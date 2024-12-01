import { db } from "@/drizzle/db";
import { productTable, userSubscriptionTable } from "@/drizzle/schema";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";
import { eq } from "drizzle-orm";

export async function deleteUser(clerkUserId: string) {
  const [userSubscription, product] = await db.batch([
    db
      .delete(userSubscriptionTable)
      .where(eq(userSubscriptionTable.clerkUserId, clerkUserId))
      .returning({ id: userSubscriptionTable.id }),
    db
      .delete(productTable)
      .where(eq(productTable.clerkUserId, clerkUserId))
      .returning({ id: productTable.id }),
  ]);

  userSubscription.forEach((userSub) => {
    revalidateDbCache({
      tag: CACHE_TAGS.subscription,
      id: userSub.id,
      userId: clerkUserId,
    });
  });

  product.forEach((prod) => {
    revalidateDbCache({
      tag: CACHE_TAGS.products,
      id: prod.id,
      userId: clerkUserId,
    });
  });

  return [userSubscription, product];
}
