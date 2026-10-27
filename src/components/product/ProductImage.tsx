import Image from "next/image";
import type { ImageData } from "@/features/catalog/types";

/**
 * Product photos come in mixed sizes and backgrounds, so they are always shown
 * contained inside a square frame on a neutral surface. Never cropped.
 */
export function ProductImage({
  image,
  sizes,
  priority,
  className = "",
}: {
  image: ImageData | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!image) {
    return (
      <div className={`flex items-center justify-center bg-mist text-sm text-steel ${className}`} aria-hidden="true">
        אין תמונה
      </div>
    );
  }
  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
