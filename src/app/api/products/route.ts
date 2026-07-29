import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/storage_actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  
  try {
    const products = await getProducts();
    if (category) {
      const filtered = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
      return NextResponse.json(filtered);
    }
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
