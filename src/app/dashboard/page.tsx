import { getProducts } from "@/server/db/products";
import { auth } from "@clerk/nextjs/server";
import NoProduct from "./_components/NoProduct";
import Link from "next/link";
import { ArrowRight, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductGrid from "./_components/ProductGrid";
import HasPermission from "@/components/HasPermission";
import { canAccessAnalytics } from "@/server/permissions";
import {
  CHART_INTERVAL,
  getViewsByDayChartData,
} from "@/server/db/productViews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ViewsByDayChart from "./_components/charts/ViewsByDayChart";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();

  if (userId == null) return redirectToSignIn();

  const products = await getProducts(userId, { limit: 6 });
  if (products.length === 0) return <NoProduct />;

  return (
    <>
      {/* Products */}
      <h2 className="mb-6 text-3xl font-semibold flex justify-between">
        <Link
          className="group flex gap-2 items-center hover:underline"
          href="/dashboard/products"
        >
          Products
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <PlusIcon className="size-4 mr-2" />
            New Product
          </Link>
        </Button>
      </h2>
      <ProductGrid products={products} />
      {/* Analytics */}
      <h2 className="my-6 text-3xl font-semibold flex justify-between">
        <Link
          className="group flex gap-2 items-center hover:underline"
          href="/dashboard/analytics"
        >
          Analytics
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </h2>
      <HasPermission permission={canAccessAnalytics} renderFallback>
        <AnalyticChart userId={userId} />
      </HasPermission>
    </>
  );
}

async function AnalyticChart({ userId }: { userId: string }) {
  const chartData = await getViewsByDayChartData({
    userId,
    timezone: "UTC",
    interval: CHART_INTERVAL.last30Days,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Views by Day</CardTitle>
      </CardHeader>
      <CardContent>
        <ViewsByDayChart chartData={chartData} />
      </CardContent>
    </Card>
  );
}
