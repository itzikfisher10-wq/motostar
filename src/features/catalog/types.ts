import type { ProductSpec } from "@/lib/db/schema/catalog";

export type ImageData = { url: string; alt: string; width: number | null; height: number | null };

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  brandName: string | null;
  image: ImageData | null;
  hoverImage: ImageData | null;
  priceFrom: number;
  priceTo: number;
  /** Compare-at price of the cheapest variant, when on sale. */
  compareAt: number | null;
  isAvailable: boolean;
  variantCount: number;
  origin: "ORIGINAL" | "AFTERMARKET" | "UNSPECIFIED";
};

export type VariantData = {
  id: string;
  title: string;
  sku: string | null;
  optionValues: Record<string, string>;
  priceAgorot: number;
  compareAtAgorot: number | null;
  isAvailable: boolean;
  /** Max quantity a customer may add (stock, or a sane cap for untracked items). */
  maxQuantity: number;
  imageId: string | null;
};

export type FitmentData = {
  makeSlug: string;
  makeName: string;
  modelSlug: string;
  modelName: string;
  yearFrom: number | null;
  yearTo: number | null;
  status: "VERIFIED" | "SELLER_STATED";
  evidence: string | null;
};

export type BreadcrumbItem = { name: string; href: string };

export type ProductDetailData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  descriptionHtml: string | null;
  brand: { slug: string; name: string } | null;
  origin: ProductCardData["origin"];
  condition: "NEW" | "USED";
  specs: ProductSpec[];
  images: (ImageData & { id: string })[];
  options: { name: string; values: string[] }[];
  variants: VariantData[];
  fitments: FitmentData[];
  breadcrumbs: BreadcrumbItem[];
  primaryCategory: { slug: string; name: string } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date;
};

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
};

export type ProductSort = "featured" | "price-asc" | "price-desc" | "newest";

export type ProductFilters = {
  categorySlug?: string;
  brandSlug?: string;
  modelId?: string;
  year?: number;
  onlyAvailable?: boolean;
  onSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};
