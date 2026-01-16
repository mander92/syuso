const { VITE_API_URL } = import.meta.env;

export const buildImageUrl = (imagePath) => {
    if (!imagePath) return '';

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    if (imagePath.startsWith('uploads/')) {
        return `${VITE_API_URL}/${imagePath}`;
    }

    return `${VITE_API_URL}/uploads/${imagePath}`;
};
