import express from 'express'; 
import mongoose from 'mongoose';
import {engine} from 'express-handlebars';
import cors from 'cors';
import path from 'path';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
// import MethodOverrideOptions from 'method-override';
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
// app.use(MethodOverrideOptions('_method'));
app.use(fileUpload());
app.use(cors()); 
const staticPath = path.join(__dirname);
app.use(express.static(staticPath));
app.use(bodyParser({ extended: false }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

//Handlebars method
app.get('/', async (req, res) => {
    const todos = [];

    const date = new Date();
    const today = date.getDay();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const currentDate = `${today} - ${month} - ${year}`;
    const documentCount = await Todo.countDocuments();

    const todoPrompt = documentCount > 0 ? 'Your tasks' : 'Create a task';

    const documents = await Todo.find().lean();
    for(const obj of documents) {
        todos.push(obj);
    };

    for(const todo of todos) {
        todo.dueAt = JSON.stringify(todo.dueAt).slice(1, 11);
    };

    console.log(todos);

    res.render('home', {
        layout: 'main', 
        todos: todos,
        date: currentDate,
        todoPrompt: todoPrompt,
    });
});

app.get('/todos/edit-form/:id', async (req, res) => {
    const date = new Date();
    const today = date.getDay();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const currentDate = `${today} - ${month} - ${year}`;
    const documentCount = await Todo.countDocuments();

    const todoPrompt = documentCount > 0 ? 'Your tasks Not mine!' : 'Create a task';

    const currentTodo = await Todo.findOne({ _id: req.params.id }).lean();
    currentTodo.dueAt = 

    console.log('current todo ', currentTodo);

    res.render('edit-todo-page', {
        layout: 'main', 
        currentTodo: currentTodo,
        date: currentDate,
        todoPrompt: todoPrompt,
    });
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
        file.mv(uploadPath);
        res.status(201).send(newAttachment);
    } catch (err) {
        console.error('ERROR!!! ', err);
    };
});

app.post('/todos', async (req, res) => {
    const reqObj = req.body;

    try {  
        const newTodo = new Todo(reqObj);
        console.log(newTodo);
        await newTodo.save();
        res.status(200).redirect('/');
    } catch (err) {
        const errors = errorJsonFromMongooseErrors(err);
        res.status(422).json({ errors });
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


//UPDATE A TODO
app.post('/todos/edit/:id', async (req, res) => {
    await Todo.findByIdAndUpdate(req.params.id, { title: req.body.title, dueAt: req.body.dueAt }, {new: true});
    res.redirect('/');
});

//DELETE A TODO
app.post('/todos/:id', async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        res.status(200).redirect('/');
    } catch (err) {
        console.error(err);
    };
});

//DELETE AN ATTACHMENT
app.post('/todos/:todoId/attachments/:attachmentId', async (req, res) => {
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