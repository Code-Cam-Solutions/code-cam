const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem("codecam-auth");
    if (stored) {
      const { token } = JSON.parse(stored);
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // ignore
  }
  return {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export interface LoginResponse {
  userId: string;
  name: string;
  token: string;
}

export async function login(name: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

// ─── Scan ──────────────────────────────────────────────────────────────────
export interface ScanResult {
  title: string;
  summary: string;
  topics: string[];
  flashcards: { question: string; answer: string }[];
  rawText: string;
}

export async function scanImage(imageBlob: Blob): Promise<ScanResult> {
  const formData = new FormData();
  formData.append("file", imageBlob, "capture.jpg");

  const headers = getAuthHeaders();
  const res = await fetch(`${BASE_URL}/scan`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<ScanResult>;
}

// ─── Folders ───────────────────────────────────────────────────────────────
export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: { contents: number };
}

export async function getFolders(): Promise<Folder[]> {
  return request<Folder[]>("/folders");
}

export async function createFolder(name: string, color: string): Promise<Folder> {
  return request<Folder>("/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
}

export async function updateFolder(
  id: string,
  data: { name?: string; color?: string }
): Promise<Folder> {
  return request<Folder>(`/folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  return request<void>(`/folders/${id}`, { method: "DELETE" });
}

// ─── Contents ──────────────────────────────────────────────────────────────
export interface Content {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  flashcards: { question: string; answer: string }[];
  rawText: string;
  imageUrl?: string;
  folderId?: string;
  createdAt: string;
}

export async function getContents(folderId?: string): Promise<Content[]> {
  const query = folderId ? `?folderId=${folderId}` : "";
  return request<Content[]>(`/contents${query}`);
}

export async function getContent(id: string): Promise<Content> {
  return request<Content>(`/contents/${id}`);
}

export async function saveContent(data: {
  title: string;
  summary: string;
  topics: string[];
  flashcards: { question: string; answer: string }[];
  rawText: string;
  folderId?: string;
}): Promise<Content> {
  return request<Content>("/contents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteContent(id: string): Promise<void> {
  return request<void>(`/contents/${id}`, { method: "DELETE" });
}
