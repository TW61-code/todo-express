import express from 'express'; 
import mongoose from 'mongoose';
import {engine} from 'express-handlebars';
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

function middlewaresEtc() {
    app.use(express.json());
    app.use(fileUpload());
    app.use(cors()); 
    const staticPath = path.join(__dirname);
    app.use(express.static(staticPath));
    app.use(express.static('todo-express')); // Could be wrong folder...
    
    app.engine('handlebars', engine());
    app.set('view engine', 'handlebars');
    app.set('views', './views');
};
middlewaresEtc();

//Handlebars method
app.get('/', async (req, res) => {
    const todos = [];

    const documents = await Todo.find().lean();
    for(const obj of documents) {
        todos.push(obj.title);
    }

    res.render('home', {layout: 'main', todos: todos});
});

//Return catch block error
const errorJsonFromMongooseErrors = (mongooseErrors) => {
    let errors = {};
    console.dir(mongooseErrors);

    for (const key in mongooseErrors.errors) {
        const details = mongooseErrors.errors[key];
        errors[key] = details.properties?.type || 'invalid';
    };

    return errors;
};

app.post('/todos', async (req, res) => {
    const reqObj = req.body;

    if(reqObj.dueAt && isNaN(reqObj.dueAt)) {
        res.status(422).json({ errors: { dueAt: 'invalid' }});
    };

    try {  
        const newTodo = new Todo(reqObj);
        await newTodo.save();
        res.status(201).json(newTodo);
    } catch (err) {
        console.log('This is the catch block error ', err);
        const errors = errorJsonFromMongooseErrors(err);
        console.log('this is the error returned from errorJSON function ', errors);
        res.status(422).json({ errors });
    };
});

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
    try {
        const selectedTodo = await Todo.findById(req.params.id);
        if (!selectedTodo) {
            res.status(404).json({ error: 'Todo not found' });
        };
        res.status(200).json(selectedTodo);
    } catch (err) {
        console.error(err);
        res.status(404).json({ error: 'Todo not found' });
    };
});

app.get('/todos/:id/attachments', async (req, res) => {
    try {
        const attachments = await Attachment.find({todoId: req.params.id});
        res.send(attachments);
    } catch (err) {
        console.error(err);
    };
});

app.get('/todos/:todoId/attachments/:attachmentId', async (req, res) => {
    try {
        const selectedAttachment = await Attachment.find({todoId: req.params.todoId, _id: req.params.attachmentId});
        res.json(selectedAttachment[0]);
    } catch (err) {
        console.error(err);
    };
});

app.put('/todos/:id', async (req, res) => {
    const updatedTodo = await Todo.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.send(updatedTodo);
});

app.delete('/todos/:id', async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        const todosLeft = await Todo.countDocuments();
        res.status(200).send('Todo succesfully deleted');
    } catch (err) {
        console.error(err);
    }
});

app.delete('/todos/:todoId/attachments/:attachmentId', async (req, res) => {
    try {
        const deletedAttachment = await Attachment.findOneAndDelete({ _id: req.params.attachmentId, todoId: req.params.todoId});
        if (!deletedAttachment) {
            res.status(404).json({error: 'Attachment not found'});
        };
        res.status(204).send();
    } catch (err) {
        res.status(404).json({error: 'Attachment not found'});
    };
});

app.listen(port, async () => {
    await connectDB();
    console.log(`Listening at localhost:${port}`);
});