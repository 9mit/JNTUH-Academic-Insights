
const API_BASE_URL = '';

// Default timeout for API requests (60 seconds for auto-fetch, 30 seconds for others)
const DEFAULT_TIMEOUT = 30000;
const AUTO_FETCH_TIMEOUT = 60000;

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



export async function fetchByHallTicket(htno: string) {
    // Validate hall ticket format
    const cleanHtno = htno.trim().toUpperCase();
    if (cleanHtno.length < 10) {
        throw new Error('Hall ticket number must be at least 10 characters');
    }

    try {
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/fetch/htno`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ htno: cleanHtno }),
            },
            AUTO_FETCH_TIMEOUT // Longer timeout for auto-fetch
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

