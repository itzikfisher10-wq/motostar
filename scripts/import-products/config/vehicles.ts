/**
 * Vehicle makes and models offered in "בחירת האופנוע שלי".
 * Only models that at least one imported product refers to are listed, plus the
 * makes the original store showed. Add models from the admin as the catalog grows.
 */
export type ModelDef = { slug: string; name: string };
export type MakeDef = { slug: string; name: string; nameHe: string; models: ModelDef[] };

export const VEHICLES: MakeDef[] = [
  {
    slug: "yamaha",
    name: "Yamaha",
    nameHe: "ימאהה",
    models: [
      { slug: "xmax-125", name: "XMAX 125" },
      { slug: "xmax-300", name: "XMAX 300" },
      { slug: "tmax-530", name: "TMAX 530" },
      { slug: "tmax-560", name: "TMAX 560" },
      { slug: "nmax-125", name: "NMAX 125" },
      { slug: "nmax-155", name: "NMAX 155" },
      { slug: "mt-07", name: "MT-07" },
      { slug: "tracer-700", name: "Tracer 700" },
      { slug: "tenere-700", name: "Ténéré 700" },
    ],
  },
  {
    slug: "sym",
    name: "SYM",
    nameHe: "סאן יאנג",
    models: [
      { slug: "joyride-125s", name: "Joyride 125S" },
      { slug: "joyride-125-evo", name: "Joyride 125 EVO" },
      { slug: "joyride-200s", name: "Joyride 200S" },
      { slug: "joyride-200-evo", name: "Joyride 200 EVO" },
      { slug: "joymax-250", name: "Joymax 250" },
      { slug: "joymax-300", name: "Joymax 300" },
      { slug: "cruisym-300", name: "Cruisym 300" },
      { slug: "jet-14", name: "Jet 14" },
    ],
  },
  {
    slug: "kymco",
    name: "Kymco",
    nameHe: "קימקו",
    models: [
      { slug: "movie-s", name: "Movie S" },
      { slug: "downtown-250", name: "Downtown 250" },
      { slug: "downtown-350", name: "Downtown 350" },
    ],
  },
  { slug: "honda", name: "Honda", nameHe: "הונדה", models: [] },
  { slug: "kawasaki", name: "Kawasaki", nameHe: "קוואסאקי", models: [] },
  { slug: "ktm", name: "KTM", nameHe: "KTM", models: [] },
  { slug: "can-am", name: "Can-Am", nameHe: "קן-אם", models: [] },
  { slug: "polaris", name: "Polaris", nameHe: "פולאריס", models: [] },
];
