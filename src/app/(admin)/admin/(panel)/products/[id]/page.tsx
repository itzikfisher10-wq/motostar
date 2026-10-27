import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { DeleteProduct } from "@/components/admin/products/DeleteProduct";
import { FitmentPanel } from "@/components/admin/products/FitmentPanel";
import { ImageManager } from "@/components/admin/products/ImageManager";
import { ProductDetailsForm } from "@/components/admin/products/ProductDetailsForm";
import { VariantsEditor } from "@/components/admin/products/VariantsEditor";
import { Badge, ProductStatusBadge } from "@/components/admin/StatusBadge";
import { agorotToInput } from "@/features/admin/forms";
import {
  addFitmentAction,
  deleteFitmentAction,
  deleteImageAction,
  deleteProductAction,
  moveImageAction,
  saveVariantsAction,
  updateImageAltAction,
  updateProductDetailsAction,
  uploadImagesAction,
} from "@/features/admin/products/actions";
import { getAdminProduct, getProductFormLookups } from "@/features/admin/products/queries";
import { requireUser } from "@/features/auth/guard";
import { can } from "@/features/auth/permissions";
import { siteUrl } from "@/lib/seo/metadata";

export const metadata: Metadata = { title: "עריכת מוצר" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser("catalog:read");
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [data, lookups] = await Promise.all([getAdminProduct(id), getProductFormLookups()]);
  if (!data) notFound();
  const { product, images, options, variants, categoryIds, fitments, sources } = data;
  const editable = can(user.role, "catalog:write");

  return (
    <>
      <PageHeader
        title={product.title}
        back={{ href: "/admin/products", label: "מוצרים" }}
        actions={
          <>
            <ProductStatusBadge status={product.status} />
            {product.needsReview && <Badge tone="bad">לבדיקה</Badge>}
            {product.status === "ACTIVE" && (
              <Link href={`/products/${product.slug}`} target="_blank" className="text-sm underline underline-offset-4">
                צפייה באתר
              </Link>
            )}
          </>
        }
      >
        {created && <p role="status" className="mt-3 text-sm text-ok">הטיוטה נוצרה. הוסיפו תמונות ופרטים, ואז שנו את הסטטוס ל&quot;פעיל&quot;.</p>}
        {product.needsReview && product.reviewNotes && (
          <div className="mt-3 rounded-[var(--radius-control)] border border-signal/25 bg-[#fff5f4] p-3 text-sm">
            <p className="font-medium">לבדיקה ידנית</p>
            <p className="mt-1 whitespace-pre-line text-steel">{product.reviewNotes}</p>
          </div>
        )}
      </PageHeader>

      {!editable ? (
        <p className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 text-sm text-steel">לחשבון שלך יש הרשאת צפייה בלבד בקטלוג.</p>
      ) : (
        <div className="space-y-6">
          <ProductDetailsForm
            action={updateProductDetailsAction.bind(null, product.id)}
            siteUrl={siteUrl("").replace(/\/$/, "")}
            lookups={lookups}
            values={{
              title: product.title,
              slug: product.slug,
              status: product.status,
              condition: product.condition,
              origin: product.origin,
              brandId: product.brandId,
              primaryCategoryId: product.primaryCategoryId,
              categoryIds,
              shortDescription: product.shortDescription,
              descriptionHtml: product.descriptionHtml,
              specs: product.specs,
              seoTitle: product.seoTitle,
              seoDescription: product.seoDescription,
              needsReview: product.needsReview,
              reviewNotes: product.reviewNotes,
            }}
          />

          <VariantsEditor
            action={saveVariantsAction.bind(null, product.id)}
            initialOptions={options.map((o) => o.name)}
            images={images.map((im, i) => ({ id: im.id, alt: im.alt, index: i + 1 }))}
            initialVariants={variants.map((v) => ({
              id: v.id,
              optionValues: v.optionValues,
              sku: v.sku ?? "",
              barcode: v.barcode ?? "",
              price: agorotToInput(v.priceAgorot),
              compareAt: agorotToInput(v.compareAtAgorot),
              isAvailable: v.isAvailable,
              inventoryTracked: v.inventoryTracked,
              stockQuantity: v.stockQuantity === null ? "" : String(v.stockQuantity),
              weightGrams: v.weightGrams === null ? "" : String(v.weightGrams),
              imageId: v.imageId,
            }))}
          />

          <ImageManager images={images} uploadAction={uploadImagesAction.bind(null, product.id)} altAction={updateImageAltAction} moveAction={moveImageAction} deleteAction={deleteImageAction} />

          <FitmentPanel fitments={fitments} models={lookups.models} addAction={addFitmentAction.bind(null, product.id)} deleteAction={deleteFitmentAction} />

          {sources.length > 0 && (
            <section className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 text-sm">
              <h2 className="font-semibold">מקור הייבוא</h2>
              <ul className="mt-2 space-y-1 text-steel">
                {sources.map((s) => (
                  <li key={s.sourceProductId}>
                    <span dir="ltr">#{s.sourceProductId}</span> · {s.resolution === "CREATED" ? "רשומה ראשית" : s.resolution === "MERGED_AS_VARIANT" ? "אוחדה כווריאציה" : "כפילות שאוחדה"} ·{" "}
                    <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" dir="ltr">
                      כתובת מקורית
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <DeleteProduct slug={product.slug} action={deleteProductAction.bind(null, product.id)} />
        </div>
      )}
    </>
  );
}
