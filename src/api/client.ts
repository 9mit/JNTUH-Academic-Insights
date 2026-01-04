
const API_BASE_URL = '';

export async function uploadPDFs(files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/analyze/pdf`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload PDFs');
    }

    return response.json();
}

export async function fetchByHallTicket(htno: string) {
    const response = await fetch(`${API_BASE_URL}/fetch/htno`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ htno }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch results');
    }

    return response.json();
}

export async function predictSGPA(semesters: any[]) {
    const response = await fetch(`${API_BASE_URL}/predict/sgpa`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(semesters),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch prediction');
    }

    return response.json();
}

