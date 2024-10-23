import express from 'express'; 
import mongoose from 'mongoose';
import {engine} from 'express-handlebars';
import cors from 'cors';
import path from 'path';
import fileUpload from 'express-fileupload';
import { urlencoded } from 'body-parser';
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
app.use(urlencoded({ extended: false }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

//Handlebars method
app.get('/', async (req, res) => {
    const todos = [];

    const currentDate = formatDate(new Date());
    const documentCount = await Todo.countDocuments();

    const todoPrompt = documentCount > 0 ? 'Your tasks' : 'Create a task';

    const documents = await Todo.find().lean();
    for(const obj of documents) {
        if(obj.dueAt) {
            console.log(formatDate(obj.dueAt));
            let formattedDateString = formatDate(obj.dueAt);
            (obj as any).formattedDueAt = formattedDateString; 
            // console.log('formatted date: ', obj.formattedDueAt) 
        } else {
            console.log('dueAt is null or undefined for this document:', obj);
            (obj as any).formattedDueAt = 'No due date';
        };

        todos.push(obj);    
    };

    console.log(documents);

    res.render('home', {
        layout: 'application', 
        todos: todos,
        date: currentDate,
        todoPrompt: todoPrompt,
    });
});

app.get('/required-field', async (req, res) => {
    const todos = [];

    const currentDate = formatDate(new Date());
    const documentCount = await Todo.countDocuments();

    const todoPrompt = documentCount > 0 ? 'Your tasks' : 'Create a task';

    const documents = await Todo.find().lean();
    for(const obj of documents) {
        if(obj.dueAt) {
            console.log(formatDate(obj.dueAt));
            let formattedDateString = formatDate(obj.dueAt);
            (obj as any).formattedDueAt = formattedDateString; 
            // console.log('formatted date: ', obj.formattedDueAt) 
        } else {
            console.log('dueAt is null or undefined for this document:', obj);
            (obj as any).formattedDueAt = 'No due date';
        };

        todos.push(obj);    
    };

    console.log(documents);

    res.render('required-fields', {
        layout: 'application', 
        todos: todos,
        date: currentDate,
        todoPrompt: todoPrompt,
    });
});

app.get('/edit-required-fields/:id', async (req, res) => {
    const currentDate = formatDate(new Date());
    const documentCount = await Todo.countDocuments();
    let dueDate;

    const todoPrompt = documentCount > 0 ? 'Your tasks Not mine!' : 'Create a task';

    const currentTodo = await Todo.findOne({ _id: req.params.id }).lean();
    if(currentTodo.dueAt) {
        dueDate = formatDate(currentTodo.dueAt);
    } else {
        dueDate = 'No due date';
    };

    res.render('edit-required-field', {
        layout: 'application', 
        currentTodo: currentTodo,
        currentDate: currentDate,
        dueDate: dueDate,
        todoPrompt: todoPrompt,
    });
});

app.get('/todos/edit-form/:id', async (req, res) => {
    const currentDate = formatDate(new Date());
    const documentCount = await Todo.countDocuments();
    let dueDate;

    const todoPrompt = documentCount > 0 ? 'Your tasks Not mine!' : 'Create a task';

    const currentTodo = await Todo.findOne({ _id: req.params.id }).lean();
    if(currentTodo.dueAt) {
        dueDate = formatDate(currentTodo.dueAt);
    } else {
        dueDate = 'No due date';
    };

    console.log('current todo ', currentTodo);

    res.render('edit-todo-page', {
        layout: 'application', 
        currentTodo: currentTodo,
        currentDate: currentDate,
        dueDate: dueDate,
        todoPrompt: todoPrompt,
    });
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
        console.dir(errors);
        res.status(422).redirect('/required-field');
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
    const reqObj = req.body;
    const currentTodo = reqObj.title;

    if (!reqObj.title) {
        const error = JSON.stringify( { errors: { title: "required"}});
        errorJsonFromMongooseErrors(error);
        // console.log(req.params.id);
        res.redirect('/edit-required-fields/' + req.params.id);
    };

    try {
        await Todo.findByIdAndUpdate(req.params.id, { title: reqObj.title, dueAt: reqObj.dueAt }, {new: true});
        res.redirect('/');
    } catch(err) {
        const errors = errorJsonFromMongooseErrors(err);
        console.dir('These are the catch block errors!: ', errors);
        res.status(422).json( {errors} );
    };
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

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth()).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${year} - ${month} - ${day}`;

    return formattedDate;
};  