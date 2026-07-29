'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/lib/products';
import Link from 'next/link';

export default function CategoryPage({ params }: { params: { id: string } }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState({
    transparency: [] as string[],
    material: [] as string[]
  });
  const [loading, setLoading] = useState(true);

  // Derive available filter options from products
  const availableTransparencies = Array.from(new Set(products.map(p => p.transparency).filter(Boolean)));
  const availableMaterials = Array.from(new Set(products.map(p => p.material).filter(Boolean)));

  useEffect(() => {
    // In a real app we'd fetch from an API route. Here we can use a server action if we were in a Server Component,
    // but since this is a client component, we should ideally fetch via an API or pass initialData as a prop.
    // To keep it simple, we'll fetch from a new API route we will create.
    fetch(`/api/products?category=${params.id}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setFilteredProducts(data);
        setLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
    let result = products;
    if (filters.transparency.length > 0) {
      result = result.filter(p => p.transparency && filters.transparency.includes(p.transparency));
    }
    if (filters.material.length > 0) {
      result = result.filter(p => p.material && filters.material.includes(p.material));
    }
    setFilteredProducts(result);
  }, [filters, products]);

  const toggleFilter = (type: 'transparency' | 'material', value: string) => {
    setFilters(prev => {
      const current = prev[type];
      if (current.includes(value)) {
        return { ...prev, [type]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [type]: [...current, value] };
      }
    });
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      
      {/* Filters Sidebar */}
      <aside style={{ width: '280px', padding: '40px 20px', borderRight: '1px solid #eaeaea', backgroundColor: '#fff' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '30px' }}>Filters</h2>
        
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '15px', color: '#666' }}>Transparency</h3>
          {availableTransparencies.map(val => (
            <div key={val as string} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
              <input 
                type="checkbox" 
                id={`trans-${val}`}
                checked={filters.transparency.includes(val as string)}
                onChange={() => toggleFilter('transparency', val as string)}
              />
              <label htmlFor={`trans-${val}`} style={{ fontSize: '0.95rem' }}>{val as string}</label>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '15px', color: '#666' }}>Material</h3>
          {availableMaterials.map(val => (
            <div key={val as string} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
              <input 
                type="checkbox" 
                id={`mat-${val}`}
                checked={filters.material.includes(val as string)}
                onChange={() => toggleFilter('material', val as string)}
              />
              <label htmlFor={`mat-${val}`} style={{ fontSize: '0.95rem' }}>{val as string}</label>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Grid */}
      <main style={{ flex: 1, padding: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '30px', textTransform: 'capitalize' }}>
          {params.id} Shades
        </h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
          {filteredProducts.map(product => (
            <Link key={product.id} href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eaeaea', transition: 'box-shadow 0.2s' }}>
                <div style={{ 
                  height: '240px', 
                  backgroundImage: `url(${product.imageUrl})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  backgroundColor: '#eee'
                }}></div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '5px' }}>{product.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '15px' }}>
                    {product.transparency} • {product.material}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {product.fabrics.slice(0, 4).map(f => (
                      <div key={f.id} style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                        {f.name}
                      </div>
                    ))}
                    {product.fabrics.length > 4 && (
                      <div style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                        +{product.fabrics.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#888' }}>
              No products found matching these filters.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
