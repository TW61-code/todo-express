import express from 'express'; 
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
import { Todo, Attachment } from './schema.js';
import { file } from 'bun';

const app = express();
const port = 3000;
const dbName = process.env.NODE_ENV == "test" ? "todos_test" : "todos_dev";
const uri = `mongodb://localhost:27017/${dbName}`;
const db = mongoose.connection;

async function connectDB() {
    await mongoose.connect(uri);
};

app.use(express.json());
app.use(fileUpload());
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
const staticPath = path.join(__dirname);
app.use(express.static(staticPath));


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

// Post an attachment
app.post('/todos/:id/attachments', async (req, res) => {

    const { id } = req.params;
    const uploadPath = __dirname + '/uploads' + id;

    try {
        // const file = req.name;
        // const fileName = file.name;
        // const size = file.size;
        // const storage_url = `localhost:3000/todos/attachments/${fileName}${id}`
        // const newAttachment = new Attachment({name: fileName, size: size, storage_url: storage_url});
        // const currentTodo = Todo.findById(id);
        // const updatedTodo = Todo.findByIdAndUpdate(id, {...currentTodo, ...newAttachment}, {new: true});
        // file.mv(uploadPath);

        // res.status(200).send('File succesfully uploaded');
    
        // const newAttachment = new Attachment(req.files);
        // newAttachment.save();
        // res.send(updatedTodo);
        console.log(req.body);
    } catch (err) {
        console.error('ERROR!!! ', err);
    };
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
    } catch (err) {
        console.error(err);
    }
});

app.listen(port, async () => {
    await connectDB();
    console.log(`Listening at localhost:${port}`);
});