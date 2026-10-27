import { relations } from "drizzle-orm";
import {
  brands,
  categories,
  productCategories,
  productImages,
  productOptions,
  productVariants,
  products,
} from "./catalog";
import { fitments, vehicleMakes, vehicleModels } from "./vehicles";
import { cartItems, carts, orderItems, orderStatusHistory, orders } from "./commerce";

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  primaryCategory: one(categories, { fields: [products.primaryCategoryId], references: [categories.id] }),
  images: many(productImages),
  options: many(productOptions),
  variants: many(productVariants),
  categories: many(productCategories),
  fitments: many(fitments),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "tree" }),
  children: many(categories, { relationName: "tree" }),
  products: many(productCategories),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, { fields: [productCategories.categoryId], references: [categories.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, { fields: [productOptions.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  image: one(productImages, { fields: [productVariants.imageId], references: [productImages.id] }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({ products: many(products) }));

export const vehicleMakesRelations = relations(vehicleMakes, ({ many }) => ({ models: many(vehicleModels) }));

export const vehicleModelsRelations = relations(vehicleModels, ({ one, many }) => ({
  make: one(vehicleMakes, { fields: [vehicleModels.makeId], references: [vehicleMakes.id] }),
  fitments: many(fitments),
}));

export const fitmentsRelations = relations(fitments, ({ one }) => ({
  product: one(products, { fields: [fitments.productId], references: [products.id] }),
  model: one(vehicleModels, { fields: [fitments.modelId], references: [vehicleModels.id] }),
}));

export const cartsRelations = relations(carts, ({ many }) => ({ items: many(cartItems) }));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  history: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));
