'use client';

import React, { useState, useEffect } from 'react';
import { Category } from '../../../lib/products';
import { getCategories, saveCategory } from '../../../lib/storage_actions';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const data = await getCategories();
    setCategories(data);
  }

  const handleAddCategory = async () => {
    const name = prompt('Enter Category Name:');
    if (!name) return;
    const imageUrl = prompt('Enter Category Image URL (optional):') || '';
    
    setIsSubmitting(true);
    const newCat: Category = {
      id: name.toLowerCase().replace(/ /g, '-'),
      name: name,
      description: 'Professional architectural window treatments.',
      imageUrl: imageUrl,
      productCount: 0,
      viewCount: 0
    };
    
    await saveCategory(newCat);
    await loadCategories();
    setIsSubmitting(false);
  };

  return (
    <div>
      <header style={{ marginBottom: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em' }}>DIGITAL ATELIER CMS</span>
          <h1 style={{ fontSize: '2.5rem' }}>Category Manager</h1>
          <p style={{ color: '#888', maxWidth: '600px', marginTop: '10px' }}>
            Curate the architectural structure of your product catalog. Drag to reorder the user's discovery journey.
          </p>
        </div>
        <button 
          onClick={handleAddCategory}
          disabled={isSubmitting}
          style={{ 
            backgroundColor: '#000', 
            color: '#fff', 
            padding: '12px 24px', 
            border: 'none', 
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: isSubmitting ? 0.5 : 1
          }}>+ NEW CATEGORY</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ 
            height: '200px', 
            backgroundColor: '#f9f9f9', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundImage: cat.imageUrl ? `url(${cat.imageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            {!cat.imageUrl && (
              <div style={{ width: '120px', height: '140px', backgroundColor: '#fff', border: '1px solid #eee', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', backgroundColor: '#eee' }}></div>
              </div>
            )}
          </div>
            
            <div style={{ padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>{cat.name}</h3>
                <span style={{ fontSize: '0.6rem', padding: '4px 8px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontWeight: 700 }}>PREMIUM</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '25px', minHeight: '40px' }}>{cat.description}</p>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#aaa', marginBottom: '4px' }}>PRODUCTS</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cat.productCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#aaa', marginBottom: '4px' }}>VIEWS</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{(cat.viewCount / 1000).toFixed(1)}k</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ flex: 1, padding: '10px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>EDIT</button>
                <button style={{ padding: '10px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
