'use client';

import React from 'react';

export default function AdminDashboard() {
  return (
    <div>
      <header style={{ marginBottom: '60px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Atelier Intelligence</h1>
        <p style={{ color: '#888' }}>Wholesale fulfillment trajectory and production metrics.</p>
      </header>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '60px' }}>
        <MetricCard label="TOTAL SALES" value="$142,850.00" trend="+12.5% vs last month" type="success" />
        <MetricCard label="PENDING ORDERS" value="24" trend="Requiring immediate action" type="danger" />
        <MetricCard label="ACTIVE CUSTOMERS" value="186" trend="Partner Tier: Platinum" type="neutral" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
        {/* Revenue Velocity Chart Area */}
        <section style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '40px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem' }}>Revenue Velocity</h2>
              <p style={{ fontSize: '0.8rem', color: '#888' }}>Wholesale fulfillment trajectory</p>
            </div>
            <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '4px' }}>
               <button style={{ padding: '6px 12px', fontSize: '0.7rem', border: 'none', background: 'none' }}>WEEKLY</button>
               <button style={{ padding: '6px 12px', fontSize: '0.7rem', border: 'none', background: '#000', color: '#fff', borderRadius: '6px' }}>MONTHLY</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', paddingBottom: '20px' }}>
            {[40, 60, 30, 80, 70, 90, 100].map((h, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ 
                  width: '40px', 
                  height: `${h}%`, 
                  backgroundColor: i === 6 ? '#000' : '#eee',
                  borderRadius: '4px',
                  transition: 'height 1s ease'
                }}></div>
                <span style={{ fontSize: '0.6rem', color: '#aaa' }}>{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'][i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Wholesale Activity */}
        <section style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '40px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '30px' }}>Recent Wholesale Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ActivityItem icon="📄" title="New Order #4829 - Zenith Towers" desc="24x Motorized Linen Shades • 2h ago" />
            <ActivityItem icon="👤" title="New Partner: Studio LVN" desc="Approved for Platinum Tier • 5h ago" />
            <ActivityItem icon="🚚" title="Order #4812 Shipped" desc="Logistics tracking updated • 8h ago" />
          </div>
          <button style={{ 
            width: '100%', 
            padding: '12px', 
            marginTop: '30px', 
            backgroundColor: 'transparent', 
            border: '1px solid #eee',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}>VIEW AUDIT LOG</button>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, type }: any) {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '30px', borderRadius: '12px' }}>
      <div style={{ fontSize: '0.6rem', color: '#888', letterSpacing: '0.1em', marginBottom: '15px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '15px' }}>{value}</div>
      <div style={{ 
        fontSize: '0.7rem', 
        color: type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#888',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        {type === 'success' && '↗'} {type === 'danger' && '•'} {trend}
      </div>
    </div>
  );
}

function ActivityItem({ icon, title, desc }: any) {
  return (
    <div style={{ display: 'flex', gap: '15px' }}>
      <div style={{ width: '40px', height: '40px', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: '0.7rem', color: '#888' }}>{desc}</div>
      </div>
    </div>
  );
}
