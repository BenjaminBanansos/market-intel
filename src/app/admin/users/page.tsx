import React from 'react';
import { getUsersList, createNewUser, removeUser } from '@/lib/storage_actions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value || '';
  
  // Check if they are an admin
  // Format is: authenticated_ROLE_TIMESTAMP
  const roleMatch = token.match(/authenticated_(.*?)_/);
  const userRole = roleMatch ? roleMatch[1] : 'admin'; // default to admin for legacy tokens

  if (userRole !== 'admin') {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '20px' }}>Access Denied</h1>
        <p>You do not have permission to view this page. Only administrators can manage users.</p>
      </div>
    );
  }

  const users = await getUsersList();

  async function handleAddUser(formData: FormData) {
    'use server';
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'admin' | 'user';

    if (username && password && role) {
      await createNewUser(username, password, role);
    }
  }

  async function handleDelete(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    if (id) {
      await removeUser(id);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>User Management</h1>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        {/* User List */}
        <div style={{ flex: 2 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>Current Users</h2>
          {users.length === 0 ? (
            <p>No database users found. System is currently relying on Master Key.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(user => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{user.username}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '10px' }}>
                      <span style={{ padding: '2px 8px', backgroundColor: user.role === 'admin' ? '#e6f7ff' : '#f6ffed', color: user.role === 'admin' ? '#096dd9' : '#389e0d', borderRadius: '10px' }}>
                        {user.role.toUpperCase()}
                      </span>
                      <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={user.id} />
                    <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add User Form */}
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #eaeaea', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>Add New User</h2>
          <form action={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Username</label>
              <input 
                name="username" 
                type="text" 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d9d9d9' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Password</label>
              <input 
                name="password" 
                type="password" 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d9d9d9' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Role</label>
              <select 
                name="role" 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d9d9d9', backgroundColor: '#fff' }}
              >
                <option value="admin">Administrator</option>
                <option value="user">Standard User</option>
              </select>
            </div>

            <button type="submit" style={{ marginTop: '10px', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
              Create User
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
