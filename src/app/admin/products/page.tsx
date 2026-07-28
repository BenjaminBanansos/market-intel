'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '../../../lib/products';
import { getProducts, deleteProduct } from '../../../lib/storage_actions';

export default function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    await deleteProduct(id);
    await loadProducts();
  };

  return (
    <div>
      <header style={{ marginBottom: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em' }}>INVENTORY CONTROL</span>
          <h1 style={{ fontSize: '2.5rem' }}>Master Product List</h1>
          <p style={{ color: '#888', marginTop: '10px' }}>Manage industrial specifications and retail availability for all window treatments.</p>
        </div>
        <Link href="/admin/products/new" style={{ 
          backgroundColor: '#000', 
          color: '#fff', 
          padding: '12px 24px', 
          border: 'none', 
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '0.9rem'
        }}>+ NEW PRODUCT</Link>
      </header>

      {isLoading ? (
        <div style={{ color: '#888' }}>Loading products...</div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee', backgroundColor: '#fcfcfc' }}>
                <th style={{ padding: '20px', fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>PRODUCT NAME</th>
                <th style={{ padding: '20px', fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>CATEGORY</th>
                <th style={{ padding: '20px', fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>BASE PRICE</th>
                <th style={{ padding: '20px', fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>STATUS</th>
                <th style={{ padding: '20px', fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>No products found in the atelier database.</td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '4px',
                          backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}></div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{product.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#aaa' }}>ID: {product.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px', fontSize: '0.8rem', color: '#555' }}>{product.category}</td>
                    <td style={{ padding: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                      ${product.basePrice} <span style={{ fontSize: '0.6rem', color: '#aaa' }}>({product.basePriceMode === 'fixed' ? 'FIXED' : 'PER SQ M'})</span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.6rem', 
                        fontWeight: 700,
                        backgroundColor: product.status === 'published' ? '#ecfdf5' : '#fef2f2',
                        color: product.status === 'published' ? '#10b981' : '#ef4444'
                      }}>{product.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Link href={`/product/${product.id}`} style={{ fontSize: '0.7rem', color: '#888', textDecoration: 'none' }}>VIEW</Link>
                        <button onClick={() => handleDelete(product.id)} style={{ border: 'none', background: 'none', fontSize: '0.7rem', color: '#ef4444', cursor: 'pointer' }}>DELETE</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
