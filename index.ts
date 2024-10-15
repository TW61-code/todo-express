import express from 'express'; 
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fileUpload from 'express-fileupload';
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
app.use(fileUpload());
app.use(cors()); 
const staticPath = path.join(__dirname);
app.use(express.static(staticPath));

app.post('/todos', (req, res) => {

    const reqObj = req.body;
    console.log(reqObj.title);

    if (!reqObj.due_at) {
        console.error('Title is required');
        res.sendStatus(204);
    };

    try {
        
        const newTodo = new Todo(reqObj);
    
        newTodo.save();
        res.send(newTodo);
    } catch (err) {
        console.error(err);
    };
});

// Post an attachment
app.post('/todos/:id/attachments', async (req, res) => {

    const { id } = req.params;
    const file = req.files.file;
    const fileCount = await Attachment.countDocuments();
    const fileName = fileCount > 0 ? `${file.name}(${fileCount})` : file.name;

    const existingFileName = await Attachment.find({name: fileName});

    if (existingFileName) {
        console.error('File already exists');
        // res.sendStatus(422);
    };

    try {

        const uploadPath = path.join(__dirname, '/uploads', fileName);
        const storagePath = `http://localhost:3000/todos/${id}/attachments`;
        //to remove red squiggly alter the fileupload middlewares type declaration to accept a single object. NOT an array (.FileArray);
        const newAttachment = await Attachment.create({name: fileName, size: 10, todoId: id, storagePath: storagePath});

        newAttachment.save();

        //THE answer is in the mongoose subDocuments document;
        // await Todo.findByIdAndUpdate(
        //     id, 
        //     {attachments: newAttachment}, 
        //     {new: true},
        // );  

        console.log(id);
        res.status(201).send(newAttachment);
        file.mv(uploadPath);
    } catch (err) {

        console.error('ERROR!!! ', err);
    };
});

app.get('/todos', async (req, res) => {

    const data = await Todo.find();
    res.send(data);
});

// Fetch a speific item
app.get('/todos/:id', async (req, res) => {

    const { id } = req.params;

    try {
        const selectedTodo = await Todo.findById(id);
        res.send(selectedTodo);
    } catch (err) {
        console.error(err);
    };
});

app.get('/todos/:id/attachments', async (req, res) => {

    const { id } = req.params;

    try {
        const attachments = await Attachment.find({todoId: id});
        res.send(attachments);
    } catch (err) {
        console.error(err);
    };
});

app.get('/todos/:todoId/attachments/:attachmentId', async (req, res) => {

    const { todoId, attachmentId } = req.params;

    try {
        const selectedAttachment = await Attachment.find({todoId: todoId, _id: attachmentId});
        res.json(selectedAttachment[0]);
    } catch (err) {
        console.error(err);
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

app.delete('/todos/:todoId/attachments/:attachmentId', async (req, res) => {

    const { todoId, attachmentId } = req.params;

    try {

        await Attachment.findOneAndDelete({todoId: todoId, _id: attachmentId});
        console.log(await Attachment.countDocuments());
        res.status(204).send('File deleted');
    } catch (err) {
        console.error(err);
    };
});

app.listen(port, async () => {
    await connectDB();
    console.log(`Listening at localhost:${port}`);
});