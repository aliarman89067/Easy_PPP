import { removeTrailingSlash } from "@/lib/utils";
import { z } from "zod";

export const productDetailsSchema = z.object({
  name: z.string().min(1, { message: "Product name is required" }),
  url: z
    .string()
    .url()
    .min(1, { message: "URL is required" })
    .transform(removeTrailingSlash),
  description: z.string().optional(),
});

export const countryDiscountFormSchema = z.object({
  groups: z.array(
    z
      .object({
        countryGroupId: z.string().min(1, "Required"),
        discountPercentage: z
          .number()
          .max(100)
          .min(1)
          .or(z.nan())
          .transform((n) => (isNaN(n) ? undefined : n))
          .optional(),
        coupon: z.string().optional(),
      })
      .refine(
        (value) => {
          const hasCoupon = value.coupon != null && value.coupon.length > 0;
          const hasDiscount = value.discountPercentage != null;
          return !(hasCoupon && !hasDiscount);
        },
        {
          message: "A discount is required if the coupon code is provided",
          path: ["root"],
        }
      )
  ),
});

export const productCustomizationSchema = z.object({
  classPrefix: z.string().optional(),
  backgroundColor: z.string().min(1, { message: "Required" }),
  textColor: z.string().min(1, { message: "Required" }),
  fontSize: z.string().min(1, { message: "Required" }),
  locationMessage: z.string().min(1, { message: "Required" }),
  bannerContainer: z.string().min(1, { message: "Required" }),
  isSticky: z.boolean(),
});