import HasPermission from "@/components/HasPermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHART_INTERVAL,
  getViewsByCountryChartData,
  getViewsByDayChartData,
  getViewsByPPPChartData,
} from "@/server/db/productViews";
import { canAccessAnalytics } from "@/server/permissions";
import { auth } from "@clerk/nextjs/server";
import ViewsByCountryChart from "../_components/charts/ViewsByCountryChart";
import ViewsByPPPChart from "../_components/charts/ViewsByPPPChart";
import ViewsByDayChart from "../_components/charts/ViewsByDayChart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { getProducts } from "@/server/db/products";
import TimezoneDropdownMenuItem from "../_components/TimezoneDropdownMenuItem";
import { createUrl } from "@/lib/utils";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    productId?: string;
    timezone?: string;
    interval?: string;
  }>;
}) {
  const { userId, redirectToSignIn } = await auth();

  if (userId == null) return redirectToSignIn();

  const getSearchParams = await searchParams;

  const timezone = getSearchParams.timezone ?? "UTC";
  const interval =
    CHART_INTERVAL[getSearchParams.interval as keyof typeof CHART_INTERVAL] ??
    CHART_INTERVAL.last7Days;
  const productId = getSearchParams.productId;

  return (
    <>
      <div className="mb-6 flex justify-between items-baseline">
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <HasPermission permission={canAccessAnalytics}>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {interval.label}
                  <ChevronDown className="size-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(CHART_INTERVAL).map(([key, value]) => (
                  <DropdownMenuItem key={key}>
                    <Link
                      href={createUrl(
                        `/dashboard/analytics/`,
                        getSearchParams,
                        {
                          interval: key,
                        }
                      )}
                    >
                      {value.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {timezone}
                  <ChevronDown className="size-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Link
                    href={createUrl(`/dashboard/analytics/`, getSearchParams, {
                      timezone: "UTC",
                    })}
                  >
                    UTC
                  </Link>
                </DropdownMenuItem>
                <TimezoneDropdownMenuItem searchParams={getSearchParams} />
              </DropdownMenuContent>
            </DropdownMenu>
            <ProductDropDown
              userId={userId}
              selectedProductId={productId}
              searchParams={getSearchParams}
            />
          </div>
        </HasPermission>
      </div>
      <HasPermission permission={canAccessAnalytics} renderFallback>
        <div className="flex flex-col gap-8">
          <ViewsByDayCard
            userId={userId}
            productId={productId}
            timezone={timezone}
            interval={interval}
          />
          <ViewsByPPPCard
            userId={userId}
            productId={productId}
            timezone={timezone}
            interval={interval}
          />
          <ViewsByCountryCard
            userId={userId}
            productId={productId}
            timezone={timezone}
            interval={interval}
          />
        </div>
      </HasPermission>
    </>
  );
}

async function ProductDropDown({
  userId,
  selectedProductId,
  searchParams,
}: {
  userId: string;
  selectedProductId?: string;
  searchParams: Record<string, string | undefined>;
}) {
  const products = await getProducts(userId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {products.find((p) => p.id == selectedProductId)?.name ??
            "All Products"}
          <ChevronDown className="size-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Link
            href={createUrl(`/dashboard/analytics`, searchParams, {
              productId: undefined,
            })}
          >
            All Products
          </Link>
        </DropdownMenuItem>
        {products.map((product) => (
          <DropdownMenuItem asChild key={product.id}>
            <Link
              href={createUrl(`/dashboard/analytics/`, searchParams, {
                productId: product.id,
              })}
            >
              {product.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function ViewsByDayCard(
  props: Parameters<typeof getViewsByDayChartData>[0]
) {
  const chartData = await getViewsByDayChartData(props);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitors per day</CardTitle>
      </CardHeader>
      <CardContent>
        <ViewsByDayChart chartData={chartData} />
      </CardContent>
    </Card>
  );
}
async function ViewsByPPPCard(
  props: Parameters<typeof getViewsByPPPChartData>[0]
) {
  const chartData = await getViewsByPPPChartData(props);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitors per PPP Group</CardTitle>
      </CardHeader>
      <CardContent>
        <ViewsByPPPChart chartData={chartData} />
      </CardContent>
    </Card>
  );
}
async function ViewsByCountryCard(
  props: Parameters<typeof getViewsByCountryChartData>[0]
) {
  const chartData = await getViewsByCountryChartData(props);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitors per Country </CardTitle>
      </CardHeader>
      <CardContent>
        <ViewsByCountryChart chartData={chartData} />
      </CardContent>
    </Card>
  );
}
