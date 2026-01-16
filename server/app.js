import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import morgan from 'morgan';
import http from 'http';

import { PORT, UPLOADS_DIR } from './env.js';

import routes from './src/routes/index.js';
import initSocket from './src/sockets/initSocket.js';

import {
    notFoundErrorController,
    errorController,
} from './src/controllers/errors/index.js';

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Archivos estáticos
app.use('/uploads', express.static(UPLOADS_DIR));

// 🔥 express-fileupload activado
app.use(
    fileUpload({
        createParentPath: true,
        useTempFiles: true,
        tempFileDir: '/tmp/',
    })
);

// Tus rutas
app.use(routes);

// 404
app.use(notFoundErrorController);

// Manejo de errores
app.use(errorController);

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
