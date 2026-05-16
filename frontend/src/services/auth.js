const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Request failed.");
  }
  return data;
}

export function signupUser(payload) {
  return requestJson("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestOtp(email) {
  return requestJson("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(payload) {
  return requestJson("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
