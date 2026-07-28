import React from 'react';
import { getProducts } from '../../../lib/storage_actions';
import Configurator from '../../../components/Configurator';
import { notFound } from 'next/navigation';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const products = await getProducts();
  const product = products.find(p => p.id === id);

  if (!product) {
    notFound();
  }

  return (
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '120px' }}>
      <div style={{ marginBottom: '40px' }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>← BACK TO CATALOG</a>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '20px', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem' }}>{product.name}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px' }}>
          {product.description}
        </p>
      </div>

      <Configurator product={product} />

      {/* Product Details Section */}
      <section style={{ marginTop: '120px', borderTop: '1px solid var(--border-subtle)', paddingTop: '60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px' }}>
          <div>
            <h4 style={{ marginBottom: '15px' }}>MATERIALS</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Premium architectural grade fabrics sourced globally and assembled in Canada. UV resistant and color-stable.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '15px' }}>MECHANISM</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Ultra-smooth lift systems with optional motorization. Compatible with major smart home ecosystems.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '15px' }}>WARRANTY</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              5-year architectural warranty on all mechanisms and fabric integrity. Serviceable across Canada.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
