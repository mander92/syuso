import path from 'path';
import checkDiskSpace from 'check-disk-space';

import { UPLOADS_DIR } from '../../../env.js';

const storageUsageController = async (req, res, next) => {
    try {
        const basePath = path.resolve(process.cwd(), UPLOADS_DIR);
        const diskPath = path.parse(basePath).root || basePath;
        const info = await checkDiskSpace(diskPath);

        const used = info.size - info.free;
        res.send({
            status: 'ok',
            data: {
                diskPath: info.diskPath,
                size: info.size,
                free: info.free,
                used,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default storageUsageController;
