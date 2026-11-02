import type { Product } from "../types";
import { deleteRows, diffRows, selectAll, upsertRows, type Row } from "./client";

type ProductRow = {
  id: string;
  cat: string;
  name: string;
  min_price: number;
  max_price: number;
  position: number;
};

type VariantRow = {
  id: string;
  product_id: string;
  name: string;
  stock: number;
  cost: number;
  price: number;
  position: number;
};

function productRows(products: Product[]): ProductRow[] {
  return products.map((p, index) => ({
    id: p.id,
    cat: p.cat,
    name: p.name,
    min_price: p.minPrice,
    max_price: p.maxPrice,
    position: index,
  }));
}

function variantRows(products: Product[]): VariantRow[] {
  return products.flatMap((p) =>
    p.variants.map((v, index) => ({
      id: v.id,
      product_id: p.id,
      name: v.name,
      stock: v.stock,
      cost: v.cost,
      price: v.price,
      position: index,
    })),
  );
}

export async function loadProducts(): Promise<Product[]> {
  const [products, variants] = await Promise.all([
    selectAll<ProductRow>("products"),
    selectAll<VariantRow>("product_variants"),
  ]);

  const byProduct = new Map<string, Product["variants"]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id) ?? [];
    list.push({
      id: v.id,
      name: v.name,
      stock: Number(v.stock),
      cost: Number(v.cost),
      price: Number(v.price),
    });
    byProduct.set(v.product_id, list);
  }

  return products.map((p) => ({
    id: p.id,
    cat: p.cat,
    name: p.name,
    minPrice: Number(p.min_price),
    maxPrice: Number(p.max_price),
    variants: byProduct.get(p.id) ?? [],
  }));
}

export async function saveProducts(
  prev: Product[],
  next: Product[],
): Promise<void> {
  const products = diffRows(productRows(prev), productRows(next), (r) => r.id);
  const variants = diffRows(variantRows(prev), variantRows(next), (r) => r.id);

  // Varian dulu (baris yatim), lalu produk — produk yang hilang menghapus
  // variannya lewat `on delete cascade`.
  await deleteRows("product_variants", "id", variants.removed);
  await deleteRows("products", "id", products.removed);
  await upsertRows("products", products.changed as unknown as Row[]);
  await upsertRows("product_variants", variants.changed as unknown as Row[]);
}
