import Banner from "@/components/Banner";
import { env } from "@/data/env/server";
import { createProductView, getProductForBanner } from "@/server/db/products";
import { canRemoveBranding, canShowDiscountBanner } from "@/server/permissions";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextRequest } from "next/server";
import { createElement } from "react";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const headersMap = await headers();
  const requestingUrl = headersMap.get("referer") || headersMap.get("origin");

  if (requestingUrl == null) return notFound();
  const countryCode = await getCountryCode();
  console.log(countryCode);
  if (countryCode == null) return notFound();

  const { product, discount, country } = await getProductForBanner({
    id: productId,
    countryCode,
    url: requestingUrl,
  });

  if (product == null) return notFound();

  const canShowBanner = await canShowDiscountBanner(product.clerkUserId);

  await createProductView({
    productId: product.id,
    countryId: country?.id,
    userId: product.clerkUserId,
  });

  if (!canShowBanner) return notFound();
  console.log(country);
  console.log(discount);
  if (country == null || discount == null) return notFound();

  return new Response(
    await getJavascript(
      product,
      country,
      discount,
      await canRemoveBranding(product.clerkUserId)
    ),
    {
      headers: { "content-type": "text/javascript" },
    }
  );
}
async function getCountryCode() {
  const geoHeaders = await headers();
  const country = geoHeaders.get("x-vercel-ip-country");
  if (country != null) return country;
  if (process.env.NODE_ENV === "development") {
    return env.TEXT_COUNTRY_CODE;
  }
}

async function getJavascript(
  product: {
    customization: {
      locationMessage: string;
      bannerContainer: string;
      textColor: string;
      backgroundColor: string;
      fontSize: string;
      isSticky: boolean;
      classPrefix?: string | null;
    };
  },
  country: { name: string },
  discount: { coupon: string; percentage: number },
  canRemoveBranding: boolean
) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return `
    const banner = document.createElement("div");
    banner.innerHTML = '${renderToStaticMarkup(
      createElement(Banner, {
        message: product.customization.locationMessage,
        mappings: {
          country: country.name,
          coupon: discount.coupon,
          discount: (discount.percentage * 100).toString(),
        },
        customization: product.customization,
        canRemoveBranding: canRemoveBranding,
      })
    )}';
    document.querySelector('${
      product.customization.bannerContainer
    }').prepend(...banner.children);
  `.replace(/(\r\n|\n|\r)/g, "");
}
