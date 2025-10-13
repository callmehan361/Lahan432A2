// Handles user authentication with the backend (Cognito integration)

/**
 * Login user and return Cognito tokens.
 * @param {string} username - Cognito username
 * @param {string} password - Cognito password
 * @returns {Promise<{idToken: string, accessToken?: string, refreshToken?: string}>}
 */
export async function login(username, password) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }

  return res.json(); // Returns { idToken, accessToken, refreshToken, expiresIn }
}

/**
 * Sign up new user.
 * @param {string} username - Cognito username
 * @param {string} password - Cognito password
 * @param {string} email - User email
 */
export async function signup(username, password, email) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Signup failed');
  }

  return res.json(); // { message: 'Signup successful...' }
}

/**
 * Confirm sign up (email verification)
 * @param {string} username
 * @param {string} code - Confirmation code sent by email
 */
export async function confirmSignup(username, code) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/auth/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, code })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Confirmation failed');
  }

  return res.json(); // { message: 'User confirmed.' }
}
