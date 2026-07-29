import { NextResponse } from 'next/server';
import { getUserByUsername, hashPassword } from '@/lib/users';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const masterPassword = 'market-intel-admin';
    let authRole = '';

    // Check Master Key first
    if (username === 'admin' && password === masterPassword) {
      authRole = 'admin'; // Master admin
    } else {
      // Check database users
      const dbUser = await getUserByUsername(username);
      if (dbUser && dbUser.passwordHash === hashPassword(password)) {
        authRole = dbUser.role;
      }
    }

    if (authRole !== '') {
      // Create a response
      const response = NextResponse.json({ success: true, message: 'Authenticated successfully' });
      
      // Set the secure HTTP-only cookie with role encoded
      response.cookies.set({
        name: 'admin_token',
        value: `authenticated_${authRole}_${Date.now()}`,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
