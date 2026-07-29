'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Categories', path: '/admin/categories', icon: '📁' },
    { label: 'Products', path: '/admin/products', icon: '📦' },
    { label: 'Users', path: '/admin/users', icon: '👥' },
    { label: 'Customization', path: '/admin/customization', icon: '⚙️' },
    { label: 'Settings', path: '/admin/settings', icon: '🔧' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#fcfcfc' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '280px', 
        borderRight: '1px solid #eee', 
        padding: '40px 20px', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        backgroundColor: '#fff',
        zIndex: 100
      }}>
        <div style={{ 
          fontSize: '0.8rem', 
          fontWeight: 700, 
          letterSpacing: '0.1em', 
          marginBottom: '60px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ width: '24px', height: '24px', backgroundColor: '#000', borderRadius: '4px' }}></div>
          ATELIER ADMIN
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <Link 
              key={item.path} 
              href={item.path}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '12px 16px',
                marginBottom: '8px',
                textDecoration: 'none',
                color: pathname === item.path ? '#000' : '#888',
                fontSize: '0.9rem',
                backgroundColor: pathname === item.path ? '#f5f5f5' : 'transparent',
                borderRadius: '8px',
                transition: 'var(--transition-smooth)'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee' }}></div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Benjamin Admin</div>
              <div style={{ fontSize: '0.7rem', color: '#aaa' }}>Super Admin</div>
            </div>
          </div>
          
          <button 
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#cf1322',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff1f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '1.1rem' }}>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, marginLeft: '280px', padding: '60px 80px' }}>
        {children}
      </main>
    </div>
  );
}
