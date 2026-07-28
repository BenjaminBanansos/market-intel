'use client';

import React, { useState } from 'react';
import { products } from '../lib/products';

export default function WholesalePortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="container flex-center" style={{ minHeight: '80vh', flexDirection: 'column' }}>
        <div style={{ maxWidth: '400px', width: '100%', padding: '40px', border: '1px solid var(--border-subtle)' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>WHOLESALE PORTAL</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
            Access exclusive Canadian pricing and project management tools for architects and contractors.
          </p>
          <div style={{ display: 'grid', gap: '15px' }}>
            <input type="text" placeholder="Partner ID" style={{ padding: '12px', border: '1px solid var(--border-subtle)' }} />
            <input type="password" placeholder="Access Key" style={{ padding: '12px', border: '1px solid var(--border-subtle)' }} />
            <button className="btn-primary" onClick={() => setIsLoggedIn(true)}>ACCESS PORTAL</button>
          </div>
          <p style={{ marginTop: '2rem', fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            NEW PARTNER? <a href="#" style={{ textDecoration: 'underline' }}>APPLY HERE</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '120px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.2em' }}>WELCOME BACK</span>
          <h1 style={{ fontSize: '2.5rem' }}>Partner Dashboard</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>CAD $12,450.00</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>QUOTA UTILIZED (APRIL)</div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
        <div>
          <h3 style={{ marginBottom: '25px' }}>Active Projects</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '15px 0', opacity: 0.5 }}>PROJECT NAME</th>
                <th style={{ padding: '15px 0', opacity: 0.5 }}>UNITS</th>
                <th style={{ padding: '15px 0', opacity: 0.5 }}>STATUS</th>
                <th style={{ padding: '15px 0', opacity: 0.5 }}>DELIVERY</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 0' }}>Skyline Residences T1</td>
                <td>42</td>
                <td><span style={{ color: '#2ecc71' }}>● MANUFACTURING</span></td>
                <td>May 12, 2024</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 0' }}>Oakview Dental Clinic</td>
                <td>12</td>
                <td><span style={{ color: '#f1c40f' }}>● PROCESSING</span></td>
                <td>May 05, 2024</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Bulk Sizing Tool</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Upload your project CSV to generate a bulk quote for Alibaba-sourced custom blinds.
          </p>
          <div style={{ height: '150px', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            DROP CSV HERE
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: '20px', backgroundColor: 'transparent', color: '#000', border: '1px solid #000' }}>
            ORDER FABRIC SWATCHES
          </button>
        </div>
      </section>
    </div>
  );
}
