import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductDetaislForm from "./forms/ProductDetailsForm";

export default function DetailsTab({
  product,
}: {
  product: {
    id: string;
    name: string;
    description: string | null;
    url: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Product Details</CardTitle>
      </CardHeader>
      <CardContent>
        <ProductDetaislForm product={product} />
      </CardContent>
    </Card>
  );
}
