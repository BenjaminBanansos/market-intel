import fs from 'fs/promises';
import path from 'path';
import { Product, Category } from './products';

const DATA_PATH = path.join(process.cwd(), 'src/data/products.json');
const CAT_PATH = path.join(process.cwd(), 'src/data/categories.json');

// Ensure data directory exists for local dev
async function ensureDir() {
  const dir = path.join(process.cwd(), 'src/data');
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {}
}

// Simple in-memory cache for dev speed
let productsCache: Product[] | null = null;
let categoriesCache: Category[] | null = null;

export async function getProducts(): Promise<Product[]> {
  try {
    if (productsCache) return productsCache;
    await ensureDir();
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    productsCache = JSON.parse(data);
    return productsCache || [];
  } catch (error) {
    console.error('Error reading products:', error);
    return [];
  }
}

export async function saveProduct(product: Product): Promise<boolean> {
  try {
    const products = await getProducts();
    const index = products.findIndex(p => p.id === product.id);
    
    if (index !== -1) {
      products[index] = product;
    } else {
      products.push(product);
    }
    
    await fs.writeFile(DATA_PATH, JSON.stringify(products, null, 2));
    productsCache = products; // Sync cache
    return true;
  } catch (error) {
    console.error('Error saving product:', error);
    return false;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const products = await getProducts();
    const filtered = products.filter(p => p.id !== id);
    await fs.writeFile(DATA_PATH, JSON.stringify(filtered, null, 2));
    productsCache = filtered; // Sync cache
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    if (categoriesCache) return categoriesCache;
    const data = await fs.readFile(CAT_PATH, 'utf-8');
    categoriesCache = JSON.parse(data);
    return categoriesCache || [];
  } catch (error) {
    console.error('Error reading categories:', error);
    return [];
  }
}

export async function saveCategory(category: Category): Promise<boolean> {
  try {
    const categories = await getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    await fs.writeFile(CAT_PATH, JSON.stringify(categories, null, 2));
    categoriesCache = categories; // Sync cache
    return true;
  } catch (error) {
    console.error('Error saving category:', error);
    return false;
  }
}
