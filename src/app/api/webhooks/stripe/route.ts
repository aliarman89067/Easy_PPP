import { env } from "@/data/env/server";
import { getTierByPriceId, subscriptionTiers } from "@/data/subscriptionTier";
import { userSubscriptionTable } from "@/drizzle/schema";
import { updateUserSubscription } from "@/server/db/subscription";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  const event = await stripe.webhooks.constructEvent(
    await request.text(),
    request.headers.get("stripe-signature") as string,
    env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case "customer.subscription.deleted": {
      await handleDelete(event.data.object);
      break;
    }
    case "customer.subscription.updated": {
      await handleUpdate(event.data.object);
      break;
    }
    case "customer.subscription.created": {
      await handleCreate(event.data.object);
      break;
    }
  }

  return new Response(null, { status: 200 });
}

async function handleCreate(subscription: Stripe.Subscription) {
  try {
    const tier = getTierByPriceId(subscription.items.data[0].price.id);
    const clerkUserId = subscription.metadata.clerkUserId;
    if (clerkUserId == null || tier == null) {
      return NextResponse.json(null, { status: 500 });
    }
    const customer = subscription.customer;
    const customerId = typeof customer === "string" ? customer : customer.id;

    return await updateUserSubscription(
      eq(userSubscriptionTable.clerkUserId, clerkUserId),
      {
        tier: tier.name,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionitemId: subscription.items.data[0].id,
      }
    );
  } catch (error) {
    console.log(error);
  }
}

async function handleUpdate(subscription: Stripe.Subscription) {
  const tier = getTierByPriceId(subscription.items.data[0].price.id);
  const customer = subscription.customer;
  const customerId = typeof customer === "string" ? customer : customer.id;
  if (tier == null) return new Response(null, { status: 500 });
  return await updateUserSubscription(
    eq(userSubscriptionTable.stripeCustomerId, customerId),
    {
      tier: tier.name,
    }
  );
}

async function handleDelete(subscription: Stripe.Subscription) {
  const customer = subscription.customer;
  const customerId = typeof customer === "string" ? customer : customer.id;
  return updateUserSubscription(
    eq(userSubscriptionTable.stripeCustomerId, customerId),
    {
      tier: subscriptionTiers.Free.name,
      stripeSubscriptionId: null,
      stripeSubscriptionitemId: null,
    }
  );
}
