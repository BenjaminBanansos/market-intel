'use client';

import React, { useState, useEffect } from 'react';
import { Product, FabricSwatch } from '../lib/products';

interface ConfiguratorProps {
  product: Product;
}

export default function Configurator({ product }: ConfiguratorProps) {
  const [width, setWidth] = useState('24');
  const [height, setHeight] = useState('36');
  const [selectedFabric, setSelectedFabric] = useState<FabricSwatch>(product.fabrics[0]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(product.basePrice);

  const parseFraction = (val: string): number => {
    if (!val) return 0;
    if (val.includes(' ')) {
      const [whole, frac] = val.split(' ');
      return parseFloat(whole) + parseFraction(frac);
    }
    if (val.includes('/')) {
      const [num, den] = val.split('/');
      return parseFloat(num) / parseFloat(den);
    }
    return parseFloat(val) || 0;
  };

  useEffect(() => {
    const w = parseFraction(width);
    const h = parseFraction(height);
    
    let price = 0;
    if (product.basePriceMode === 'perSqFt') {
      const sqFt = (w * h) / 144;
      price = sqFt * product.basePrice;
    } else {
      price = product.basePrice;
    }

    // Add fabric modifier
    price += (selectedFabric?.priceModifier || 0);

    // Add selected addons
    if (product.addons) {
      const addonPrice = product.addons
        .filter(a => selectedAddons.includes(a.id))
        .reduce((sum, a) => sum + a.price, 0);
      price += addonPrice;
    }

    setTotalPrice(Math.round(price));
  }, [width, height, selectedFabric, selectedAddons, product.basePrice, product.basePriceMode, product.addons]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 400px', gap: '60px' }}>
      {/* Visual Preview */}
      <div style={{ 
        backgroundColor: '#f9f9f9', 
        height: '600px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        borderRadius: '8px'
      }}>
        <div style={{ 
          width: `${Math.min((parseFraction(width) || 24) * 3, 100)}%`, 
          height: `${Math.min((parseFraction(height) || 36) * 2, 80)}%`,
          backgroundColor: selectedFabric?.hex || '#eee',
          backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : 'none',
          backgroundSize: 'cover',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
           {/* Mock Headrail */}
           <div style={{ height: '20px', background: '#222', width: '100%', position: 'absolute', top: -20, borderRadius: '2px 2px 0 0' }}></div>
        </div>
        <div style={{ marginTop: 'auto', textAlign: 'center', color: '#888', fontSize: '0.7rem' }}>
          PREVIEW: {selectedFabric?.name} | {width}" x {height}"
        </div>
      </div>

      {/* Control Panel */}
      <div style={{ padding: '10px 0' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '2.5rem', fontWeight: 500, letterSpacing: '-0.02em' }}>Configure Treatment</h2>
        
        {/* Measurements */}
        <div style={{ marginBottom: '3rem' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'block', color: '#888' }}>
            Precision Dimensions (Inches)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block', marginBottom: '8px' }}>WIDTH</label>
              <input 
                type="text" 
                placeholder="e.g. 24 1/2"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                style={{ width: '100%', padding: '15px', border: '1px solid #eee', borderRadius: '8px', fontSize: '1rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.6rem', color: '#ccc', marginTop: '6px' }}>
                Supports fractions (1/8, 1/4, etc)
              </p>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block', marginBottom: '8px' }}>HEIGHT</label>
              <input 
                type="text" 
                placeholder="e.g. 36 3/4"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                style={{ width: '100%', padding: '15px', border: '1px solid #eee', borderRadius: '8px', fontSize: '1rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.6rem', color: '#ccc', marginTop: '6px' }}>
                Precision measurement
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'block', color: '#888' }}>
            Architectural Finish
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {product.fabrics.map(f => (
              <div 
                key={f.id}
                onClick={() => setSelectedFabric(f)}
                style={{ 
                  width: '44px', height: '44px', borderRadius: '50%', backgroundColor: f.hex, cursor: 'pointer',
                  border: selectedFabric?.id === f.id ? '2px solid #000' : '2px solid transparent',
                  boxShadow: selectedFabric?.id === f.id ? '0 0 0 2px #fff inset' : 'none',
                  transition: 'all 0.3s ease'
                }}
                title={f.name}
              />
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '12px', color: '#555', fontWeight: 500 }}>{selectedFabric?.name}</p>
        </div>

        {/* Add-ons */}
        {product.addons && product.addons.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'block', color: '#888' }}>
              Enhancements & Hardware
            </label>
            <div style={{ display: 'grid', gap: '10px' }}>
              {product.addons.map(addon => (
                <label key={addon.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '12px', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer',
                  backgroundColor: selectedAddons.includes(addon.id) ? '#fafafa' : 'transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedAddons.includes(addon.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedAddons([...selectedAddons, addon.id]);
                        else setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                      }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{addon.name}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>+${addon.price}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Price & Add to Cart */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '2.5rem', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>ESTIMATED TOTAL</span>
            <span style={{ fontSize: '2.2rem', fontWeight: 600 }}>${totalPrice} CAD</span>
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: '1.2rem', borderRadius: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
            ADD TO PROJECT
          </button>
        </div>
      </div>
    </div>
  );
}
