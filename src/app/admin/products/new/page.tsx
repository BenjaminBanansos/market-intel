'use client';

import React, { useState, useEffect } from 'react';
import { Product, FabricSwatch, Category } from '../../../../lib/products';
import { saveProduct, getCategories } from '../../../../lib/storage_actions';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: '',
    basePrice: 10,
    basePriceMode: 'perSqFt',
    description: '',
    imageUrl: '',
    status: 'published',
    fabrics: [
      { id: 'f1', name: 'Standard Linen', hex: '#f5f5f5', priceModifier: 0 }
    ],
    addons: [],
    constraints: { minWidth: 400, maxWidth: 3000, minHeight: 400, maxHeight: 4000 },
    logic: []
  });

  useEffect(() => {
    async function load() {
      const cats = await getCategories();
      setCategories(cats);
      if (cats.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: cats[0].name }));
      }
    }
    load();
  }, []); // Only run once on mount

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSave = async () => {
    if (!formData.name) {
      alert('Missing Product Name');
      return;
    }
    
    const finalProduct = {
      ...formData,
      id: formData.name.toLowerCase().replace(/ /g, '-'),
    } as Product;
    
    const success = await saveProduct(finalProduct);
    if (success) {
      router.push('/admin/products');
    } else {
      alert('Failed to save product. Check server logs.');
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <header style={{ marginBottom: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em' }}>CATALOG MANAGEMENT</span>
          <h1 style={{ fontSize: '2.5rem' }}>Modular Product Builder</h1>
          <p style={{ color: '#888', marginTop: '10px' }}>Configure architectural window treatments with precise logic and physical constraints.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={handleSave} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#000', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Publish Product</button>
        </div>
      </header>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '40px', marginBottom: '60px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <StepIcon num={1} active={step >= 1} label="BASIC INFO" />
        <StepIcon num={2} active={step >= 2} label="DIMENSIONS" />
        <StepIcon num={3} active={step >= 3} label="HARDWARE" />
        <StepIcon num={4} active={step >= 4} label="LOGIC / RULES" />
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '40px' }}>
        {step === 1 && <BasicInfoStep data={formData} update={setFormData} categories={categories} />}
        {step === 2 && <DimensionsStep data={formData} update={setFormData} />}
        {step === 3 && <HardwareStep data={formData} update={setFormData} />}
        {step === 4 && <LogicStep data={formData} update={setFormData} />}

        <div style={{ marginTop: '60px', borderTop: '1px solid #eee', paddingTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={handleBack} style={{ padding: '12px 24px', border: 'none', background: 'none', color: '#888', cursor: 'pointer', opacity: step === 1 ? 0 : 1 }}>← BACK</button>
          <button onClick={handleNext} style={{ 
            padding: '12px 40px', 
            backgroundColor: '#000', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: 600, 
            cursor: 'pointer',
            display: step === 4 ? 'none' : 'block'
          }}>NEXT STEP</button>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ num, active, label }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', opacity: active ? 1 : 0.3 }}>
       <div style={{ 
         width: '32px', height: '32px', borderRadius: '50%', 
         backgroundColor: active ? '#000' : '#eee', 
         color: active ? '#fff' : '#000',
         display: 'flex', alignItems: 'center', justifyContent: 'center',
         fontSize: '0.8rem', fontWeight: 700
       }}>{num}</div>
       <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em' }}>{label}</div>
    </div>
  );
}

function BasicInfoStep({ data, update, categories }: any) {
  return (
    <div style={{ display: 'grid', gap: '40px' }}>
      <Section title="Basic Information">
        <div style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '10px' }}>PRODUCT NAME</label>
            <input 
              placeholder="e.g., Signature S-Fold Linen"
              value={data.name}
              onChange={e => update({...data, name: e.target.value})}
              style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
             <div>
                <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '10px' }}>CATEGORY</label>
                <select 
                  value={data.category}
                  onChange={e => update({...data, category: e.target.value})}
                  style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9' }}
                >
                  {categories.length === 0 ? <option disabled>No categories found</option> : categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
             </div>
             <div>
                <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '10px' }}>PRICING MODE</label>
                <select 
                  value={data.basePriceMode}
                  onChange={e => update({...data, basePriceMode: e.target.value})}
                  style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9' }}
                >
                  <option value="perSqFt">Per Sq Ft</option>
                  <option value="fixed">Fixed Price</option>
                </select>
             </div>
             <div>
                <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '10px' }}>
                  {data.basePriceMode === 'perSqFt' ? 'PRICE / SQFT ($)' : 'BASE PRICE ($)'}
                </label>
                <input 
                  type="number"
                  value={data.basePrice}
                  onChange={e => update({...data, basePrice: parseFloat(e.target.value)})}
                  style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9' }}
                />
             </div>
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '10px' }}>PRODUCT IMAGE URL</label>
            <input 
              placeholder="https://images.unsplash.com/..."
              value={data.imageUrl}
              onChange={e => update({...data, imageUrl: e.target.value})}
              style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9' }}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

function DimensionsStep({ data, update }: any) {
  const c = data.constraints;
  const setC = (nc: any) => update({...data, constraints: {...c, ...nc}});

  return (
    <Section title="Dimension Constraints (MM)">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
           <div style={{ padding: '24px', backgroundColor: '#fcfcfc', border: '1px solid #eee', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.8rem', marginBottom: '20px' }}>WIDTH</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div>
                    <label style={{ fontSize: '0.6rem', color: '#888' }}>MIN</label>
                    <input type="number" value={c.minWidth} onChange={e => setC({minWidth: parseInt(e.target.value)})} style={{ width: '100%', border: 'none', background: '#f5f5f5', padding: '10px', marginTop: '5px' }} />
                 </div>
                 <div>
                    <label style={{ fontSize: '0.6rem', color: '#888' }}>MAX</label>
                    <input type="number" value={c.maxWidth} onChange={e => setC({maxWidth: parseInt(e.target.value)})} style={{ width: '100%', border: 'none', background: '#f5f5f5', padding: '10px', marginTop: '5px' }} />
                 </div>
              </div>
           </div>
           <div style={{ padding: '24px', backgroundColor: '#fcfcfc', border: '1px solid #eee', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.8rem', marginBottom: '20px' }}>HEIGHT</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div>
                    <label style={{ fontSize: '0.6rem', color: '#888' }}>MIN</label>
                    <input type="number" value={c.minHeight} onChange={e => setC({minHeight: parseInt(e.target.value)})} style={{ width: '100%', border: 'none', background: '#f5f5f5', padding: '10px', marginTop: '5px' }} />
                 </div>
                 <div>
                    <label style={{ fontSize: '0.6rem', color: '#888' }}>MAX</label>
                    <input type="number" value={c.maxHeight} onChange={e => setC({maxHeight: parseInt(e.target.value)})} style={{ width: '100%', border: 'none', background: '#f5f5f5', padding: '10px', marginTop: '5px' }} />
                 </div>
              </div>
           </div>
      </div>
    </Section>
  );
}

function HardwareStep({ data, update }: any) {
  const addFabric = () => {
    const name = prompt('Fabric Name:');
    if (!name) return;
    const hex = prompt('Hex Color:', '#ffffff');
    const newFab: FabricSwatch = { id: Date.now().toString(), name, hex: hex || '#fff', priceModifier: 0 };
    update({ ...data, fabrics: [...data.fabrics, newFab] });
  };

  return (
    <Section title="Fabric & Finishes">
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '15px' }}>AVAILABLE FABRICS</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          {data.fabrics.map((f: any) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: f.hex }}></div>
              <span style={{ fontSize: '0.8rem' }}>{f.name}</span>
            </div>
          ))}
          <button onClick={addFabric} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px dashed #ccc', cursor: 'pointer', fontSize: '0.8rem' }}>+ Add Fabric</button>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '15px' }}>PRICE ADD-ONS (HARDWARE, MOTORS, ETC)</h4>
        <div style={{ display: 'grid', gap: '10px' }}>
          {data.addons?.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', border: '1px solid #eee', borderRadius: '8px', background: '#fcfcfc' }}>
               <span style={{ fontWeight: 600 }}>{a.name}</span>
               <span style={{ color: '#888' }}>+${a.price}</span>
            </div>
          ))}
          <button onClick={() => {
            const name = prompt('Add-on Name (e.g. Somfy Motor):');
            if (!name) return;
            const price = prompt('Price addition ($):', '50');
            const newAddon = { id: Date.now().toString(), name, price: parseFloat(price || '0') };
            update({ ...data, addons: [...(data.addons || []), newAddon] });
          }} style={{ padding: '15px', borderRadius: '8px', border: '1px dashed #ccc', cursor: 'pointer', fontSize: '0.9rem' }}>
            + Add Price Add-on
          </button>
        </div>
      </div>
    </Section>
  );
}

function LogicStep({ data, update }: any) {
  return (
    <Section title="Customization Logic">
      <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>Apply pricing surcharges and material compatibility rules.</p>
      <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '12px', background: '#fcfcfc' }}>
         <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Oversize Width Logic</div>
         <div style={{ fontSize: '0.7rem', color: '#888' }}>If Width {'>'} 2500mm, apply +15% material surcharge.</div>
      </div>
    </Section>
  );
}

function Section({ title, children }: any) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '25px', color: '#000' }}>{title}</h3>
      {children}
    </div>
  );
}
