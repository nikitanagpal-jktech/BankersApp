const API_BASE_URL = (
    import.meta.env.VITE_API_URL ||
    'https://bankersapp-791270280946.us-central1.run.app'
).replace(/\/$/, '');

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = typeof input === 'string' && input.startsWith('/api/')
        ? `${API_BASE_URL}${input}`
        : input;

    return fetch(request, init);
}
