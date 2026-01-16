import fs from 'fs/promises';
import path from 'path';

import { UPLOADS_DIR } from '../../env.js';

export const removeChatImagePath = async (imagePath) => {
    if (!imagePath) return;
    const finalPath = path.join(process.cwd(), UPLOADS_DIR, imagePath);
    try {
        await fs.unlink(finalPath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
};
