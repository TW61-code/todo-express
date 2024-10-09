import express from 'express';
import mongoose from 'mongoose';
import { Todo, Attachment } from './schema.js';

const app = express();
const port = 3000;
const dbName = process.env.NODE_ENV == "test" ? "todos_test" : "todos_dev";
const uri = `mongodb://localhost:27017/${dbName}`;

async function connectDB() {
    await mongoose.connect('mongodb://127.0.0.1:27017/todos_test')
        .catch((err) => console.log(err));
};

app.use(express.json());

app.get('/todos', async (req, res) => {
    const data = Todo.find();
    res.send(await data);
});

app.listen(port, async () => {
    await connectDB();
    console.log(`Listening at localhost:${port}`);
});