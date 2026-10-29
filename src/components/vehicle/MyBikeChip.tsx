"use client";

import Link from "next/link";
import { BikeIcon } from "@/components/ui/icons";
import { myBikeHref, useMyBike } from "./my-bike-storage";

/** Header shortcut to the saved bike's compatible parts (desktop). */
export function MyBikeChip() {
  const bike = useMyBike();
  if (!bike) return null;
  return (
    <Link href={myBikeHref(bike)} className="hidden h-9 items-center gap-2 glass-dark rounded-full px-3.5 text-sm font-medium hover:bg-white/15 md:flex">
      <BikeIcon size={18} />
      <span className="ltr-isolate">
        {bike.makeName} {bike.modelName}
        {bike.year ? ` ${bike.year}` : ""}
      </span>
    </Link>
  );
}
