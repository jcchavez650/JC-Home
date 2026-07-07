const TOKEN_KEY = "carb-counter:token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// --- AI estimation ---
export const identifyFood = (payload) => request("POST", "/api/identify", payload);
export const estimateCarbs = (payload) => request("POST", "/api/estimate", payload);

// --- Auth ---
export const signupApi = (email, password) => request("POST", "/api/auth/signup", { email, password });
export const loginApi = (email, password) => request("POST", "/api/auth/login", { email, password });
export const meApi = () => request("GET", "/api/auth/me");

// --- Entries + report ---
export const createEntryApi = (entry) => request("POST", "/api/entries", entry);
export const listEntriesApi = (date) =>
  request("GET", `/api/entries${date ? `?date=${date}` : ""}`);
export const deleteEntryApi = (id) => request("DELETE", `/api/entries/${id}`);
export const reportApi = (days = 14) => request("GET", `/api/report?days=${days}`);

/** Downscale + JPEG-encode an image file, return { base64, mediaType }. */
export function fileToCompressedImage(file, maxDimension = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      img.onerror = () => reject(new Error("Could not decode image file."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
