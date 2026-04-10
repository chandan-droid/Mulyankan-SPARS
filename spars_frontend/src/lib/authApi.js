const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
).replace(/\/$/, '');

function getErrorMessage(payload, fallbackMessage) {
  if (!payload) return fallbackMessage;
  if (typeof payload === 'string') return payload;
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  return fallbackMessage;
}

function buildUrl(path) {
  return `${API_BASE}${path}`;
}

async function parseApiResponse(response, fallbackMessage) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackMessage));
  }

  if (payload && payload.success === false) {
    throw new Error(getErrorMessage(payload, fallbackMessage));
  }

  return payload;
}

function normalizeRole(role) {
  if (typeof role !== 'string') return null;
  return role.toLowerCase();
}

function extractRole(authData) {
  const directRole =
    authData?.role ?? authData?.userRole ?? authData?.user?.role ?? null;
  const normalizedDirectRole = normalizeRole(directRole);
  if (normalizedDirectRole) return normalizedDirectRole;

  const authorities = authData?.authorities;
  if (Array.isArray(authorities)) {
    const rawAuthority = authorities.find((a) => typeof a === 'string') || '';
    if (rawAuthority) {
      return rawAuthority.toLowerCase().replace(/^role_/, '');
    }
  }

  return null;
}

function normalizeLoginData(authData, email) {
  const token =
    authData?.token ?? authData?.accessToken ?? authData?.jwt ?? authData?.data?.token;

  if (!token) {
    throw new Error('Login response did not include an auth token');
  }

  const role = extractRole(authData);
  const user = {
    id: authData?.userId ?? authData?.id ?? authData?.user?.id ?? null,
    name:
      authData?.name ??
      authData?.fullName ??
      authData?.user?.name ??
      authData?.user?.fullName ??
      email,
    email: authData?.email ?? authData?.user?.email ?? email,
    role: role || 'teacher',
  };

  return {
    token,
    user,
  };
}

export async function loginRequest(email, password) {
  const response = await fetch(buildUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const payload = await parseApiResponse(response, 'Login failed');
  return normalizeLoginData(payload?.data ?? payload, email);
}

export async function changePasswordRequest(token, currentPassword, newPassword) {
  const response = await fetch(buildUrl('/api/auth/change-password'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  await parseApiResponse(response, 'Password change failed');
}