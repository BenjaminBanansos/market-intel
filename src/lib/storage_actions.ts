'use server';

import { 
  getProducts as getRaw, 
  saveProduct as saveRaw, 
  deleteProduct as deleteRaw,
  getCategories as getCatRaw,
  saveCategory as saveCatRaw
} from './storage';
import { Product, Category } from './products';
import { revalidatePath } from 'next/cache';

export async function getProducts() {
  return await getRaw();
}

export async function saveProduct(product: Product) {
  const success = await saveRaw(product);
  if (success) {
    revalidatePath('/');
    revalidatePath(`/product/${product.id}`);
    revalidatePath('/admin');
  }
  return success;
}

export async function deleteProduct(id: string) {
  const success = await deleteRaw(id);
  if (success) {
    revalidatePath('/');
    revalidatePath('/admin');
  }
  return success;
}

export async function getCategories() {
  return await getCatRaw();
}

export async function saveCategory(category: Category) {
  const success = await saveCatRaw(category);
  if (success) {
    revalidatePath('/admin/categories');
    revalidatePath('/admin');
  }
  return success;
}
