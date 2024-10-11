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

    const data = await Todo.find();
    res.send(data);
});

// Fetch a speific item
app.get('/todos/:id', async (req, res) => {

    const { id } = req.params;

    try {
        const selectedTodo = await Todo.findById(id);
        res.status(200).send(selectedTodo);
    } catch (err) {
        console.error(err);
    };
});

app.post('/todos', (req, res) => {

    const newTodo = new Todo(req.body);

    newTodo.save();
    res.send(newTodo);
});

app.put('/todos/:id', async (req, res) => {

    const { id } = req.params;

    const updatedTodo = await Todo.findByIdAndUpdate(id, req.body, {new: true});
    res.send(updatedTodo);
});

app.delete('/todos/:id', async (req, res) => {

    const { id } = req.params;

    try {
        await Todo.findByIdAndDelete(id);
        const todosLeft = await Todo.countDocuments();
        res.status(200).send('Todo succesfully deleted');
        console.log(todosLeft);
    } catch (err) {
        console.error(err);
    }
});

app.listen(port, async () => {
    await connectDB();
    console.log(`Listening at localhost:${port}`);
});