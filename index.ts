import express from 'express';
//import schema from DIFFERENT DIRECTORY

const app = express();
const port = 3000;

app.use(express.json());

app.listen(port, () => {
    console.log(`Listening at localhost:${port}`);
});