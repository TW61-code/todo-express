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

    try {
        const data = await Todo.find();
        res.status(200).send(data);
    } catch (err) {
        console.error(err);
        res.status()
    }
});

app.get('/todos/:id', async (req, res) => {

    const { id } = req.params;

    try {
        const currentTodo = await Todo.findById(id);
        res.status(200).send(currentTodo);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    };
});

app.post('/todos', async (req, res) => {

    const newTodo = new Todo(req.body);

    await newTodo.save();
    res.send(JSON.stringify(req.body));
});

app.put('/todos/:id', async (req, res) => {

    const { id } = req.params;
    
    const updatedTodo = await Todo.findByIdAndUpdate(id, req.body, {new: true});
    res.send(updatedTodo);
});

app.delete('/todos/:id', async (req, res) => {

    const { id } = req.params;

    await Todo.findByIdAndDelete(id);
    res.send('deleted');
});

app.listen(port, async () => {
    await connectDB();
    console.log(`Listening at localhost:${port}`);
});