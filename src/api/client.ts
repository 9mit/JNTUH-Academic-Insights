
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Default timeout for API requests (60 seconds for auto-fetch, 30 seconds for others)
const DEFAULT_TIMEOUT = 30000;
/** hardRefresh + dual dhethi poll can exceed 60s */
const AUTO_FETCH_TIMEOUT = 180000;

/**
 * Helper to create a fetch request with timeout
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Extract user-friendly error message from API response
 */
async function extractErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    try {
        const error = await response.json();
        return error.detail || error.message || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

export async function uploadPDFs(files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });

    try {
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/analyze/pdf`,
            { method: 'POST', body: formData },
            DEFAULT_TIMEOUT
        );

        if (!response.ok) {
            const message = await extractErrorMessage(response, 'Failed to upload PDFs');
            throw new Error(message);
        }

        return response.json();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw error;
    }
}



/** Parse a hall ticket (single HT; same number is kept after detention). */
export function parseHallTicketInput(raw: string): { primary: string; related: string[] } {
    const tokens = raw
        .trim()
        .toUpperCase()
        .split(/[,;\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

    const valid: string[] = [];
    for (const t of tokens) {
        if (/[\x00-\x1f\x7f]/.test(t) || !/^[0-9]{2}[A-Z0-9]{8}$/.test(t)) {
            continue;
        }
        if (!valid.includes(t)) valid.push(t);
        if (valid.length >= 2) break;
    }

    if (valid.length === 0) {
        throw new Error('Enter a valid 10-character hall ticket number');
    }

    return { primary: valid[0], related: valid.slice(1) };
}

export async function fetchByHallTicket(htno: string, forceRefresh = true, regulation?: string) {
    const { primary, related } = parseHallTicketInput(htno);

    try {
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/fetch/htno`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    htno: primary,
                    related_htnos: related,
                    force_refresh: forceRefresh,
                    regulation: regulation || undefined,
                }),
            },
            AUTO_FETCH_TIMEOUT
        );

        if (!response.ok) {
            const message = await extractErrorMessage(response, 'Failed to fetch results');
            throw new Error(message);
        }

        return response.json();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out. Auto-fetch may take up to 60 seconds. Please try again.');
        }
        throw error;
    }
}

export async function predictSGPA(semesters: { year: number; sem: number; sgpa: number }[]) {
    if (semesters.length < 2) {
        throw new Error('Need at least 2 semesters of data for prediction');
    }

    try {
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/predict/sgpa`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(semesters),
            },
            DEFAULT_TIMEOUT
        );

        if (!response.ok) {
            const message = await extractErrorMessage(response, 'Failed to fetch prediction');
            throw new Error(message);
        }

        return response.json();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Prediction request timed out. Please try again.');
        }
        throw error;
    }
}

