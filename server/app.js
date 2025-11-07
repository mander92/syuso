import express from "express";
import morgan from 'morgan';
import cors from 'cors';
import fileUpload from "express-fileupload";
import router from "./src/routes/index.js";

import { PORT, UPLOADS_DIR } from './env.js';


import {
    notFoundErrorController,
    errorController,
} from './src/controllers/errors/index.js';



const app = express();

app.use(morgan('dev'));

app.use(cors());

app.use(express.static(UPLOADS_DIR));

app.use(express.json());

app.use(fileUpload());


app.use(router);


app.use(notFoundErrorController);

app.use(errorController);

app.listen(PORT, () => {
    console.log(`server running on port http://localhost:${PORT}`)
});
