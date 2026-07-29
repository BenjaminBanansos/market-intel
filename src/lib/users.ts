import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

const dataFile = path.join(process.cwd(), 'src', 'data', 'users.json');

// Helper to hash passwords securely
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function getUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(dataFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

export async function saveUser(user: User): Promise<boolean> {
  try {
    const users = await getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    
    await fs.writeFile(dataFile, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const users = await getUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    await fs.writeFile(dataFile, JSON.stringify(filteredUsers, null, 2));
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.username === username) || null;
}
