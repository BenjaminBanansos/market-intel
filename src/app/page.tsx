import React from 'react';
import { getProducts } from '../lib/storage_actions';
import Link from 'next/link';

export default async function Home() {
  const products = await getProducts();
  
  // Group categories for the grid
  const groups = Array.from(new Set(products.map(p => p.category)));
  const displayProducts = groups.map(group => products.find(p => p.category === group)!);
  return (
    <main style={{ flex: 1 }}>
      {/* Navigation */}
      <nav style={{ 
        height: '80px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 4rem',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        zIndex: 100
      }}>
        <div style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.25rem', letterSpacing: '0.1em', fontWeight: 600 }}>
          STITCH CANADA
        </div>
        <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.05em' }}>
          <a href="#retail">RETAIL</a>
          <a href="#wholesale" style={{ color: 'var(--text-secondary)' }}>WHOLESALE</a>
          <a href="#about" style={{ color: 'var(--text-secondary)' }}>OUR STORY</a>
        </div>
        <div>
          <button className="btn-primary" style={{ padding: '0.6rem 1.4rem', fontSize: '0.75rem' }}>
            WHATSAPP US
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ 
        height: '80vh', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div className="flex-center" style={{ padding: '0 10%', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.3em', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            EST. 2024 | TORONTO, CANADA
          </span>
          <h1 style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '2rem' }}>
            Architectural <br/> Light Control.
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '3rem', fontSize: '1.1rem' }}>
            Custom-engineered window treatments designed for the modern Canadian home. Wholesale & Retail solutions.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary">EXPLORE CATALOG</button>
            <button className="btn-primary btn-outline">WHOLESALE LOGIN</button>
          </div>
        </div>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
           {/* Fallback visual for Hero Image since generator failed */}
           <div style={{ 
             width: '100%', 
             height: '100%', 
             background: 'linear-gradient(135deg, #1a1a1a 0%, #2b2b2b 100%)',
             display: 'flex',
             alignItems: 'flex-end',
             padding: '4rem'
           }}>
             <div style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-outfit)', fontSize: '5rem' }}>
               ZENITH ZEBRA<br/>SERIES 01
             </div>
           </div>
        </div>
      </section>

      {/* Category Grid */}
      <section id="retail" className="container" style={{ padding: '8rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Select Your Style</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Hand-picked fabrics and premium mechanisms.</p>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '40px' 
        }}>
          {displayProducts.map(product => (
            <Link key={product.category} href={`/categories/${product.category}`} style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                height: '400px', 
                backgroundColor: product.fabrics?.[0]?.hex || '#eee', 
                backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '1.5rem',
                transition: 'var(--transition-smooth)',
                position: 'relative'
              }}>
                 {/* Product Overlay */}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', textTransform: 'capitalize' }}>{product.category} Shades</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Explore Collection</p>
                </div>
                <div style={{ fontSize: '1.2rem' }}>→</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '4rem', 
        backgroundColor: 'var(--accent-dark)', 
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.5rem', marginBottom: '2rem' }}>STITCH</div>
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem' }}>© 2024 STITCH BLINDS CANADA. ALL RIGHTS RESERVED.</p>
        <Link href="/admin" style={{ fontSize: '0.6rem', opacity: 0.3, textDecoration: 'none', color: 'white', letterSpacing: '0.1em' }}>
          ADMIN ACCESS
        </Link>
      </footer>
    </main>
  );
}
