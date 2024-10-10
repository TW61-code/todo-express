import express from 'express';
import mongoose from 'mongoose';
import { Todo, Attachment } from './schema.js';

const app = express();
const port = 3000;
const dbName = process.env.NODE_ENV == "test" ? "todos_test" : "todos_dev";
const uri = `mongodb://localhost:27017/${dbName}`;
const db = mongoose.connection;

async function connectDB() {
    await mongoose.connect(uri);
};

app.use(express.json());

app.get('/todos', async (req, res) => {

    const data = Todo.find();
    // console.log(data);
    res.send(await data);
});

app.post('/todos', (req, res) => {

    const newTodo = new Todo(req.body);

    newTodo.save();
    console.log(Todo.find());
    res.send(JSON.stringify(req.body));
});

app.listen(port, async () => {
    await connectDB();
    console.log(`Listening at localhost:${port}`);
});