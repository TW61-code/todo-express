import express from 'express'; 
import mongoose from 'mongoose';
import expbs, {engine} from 'express-handlebars';
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

const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "long",
    day: "numeric",
}

const hbs = engine({
    defaultLayout: 'application',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),

    helpers: {

        formatDate(date) {
            if(!date) {
                return 'No due date';
            } else {
                return new Date(date).toLocaleString('en-US', dateOptions);
            }
        }
    },
});

app.engine('handlebars', hbs);
app.set('view engine', 'handlebars');
app.set('views', './views');

//Handlebars method
//HOME
app.get('/', async (req, res) => {
    await Todo.updateMany({}, { edit: false, foundTodo: false });
    const todos = await renderTodos();

    res.render('home', {
        layout: 'application', 
        todos: todos,
    });
});

app.get('/required-field', async (req, res) => {
    await Todo.updateMany({}, { edit: false }, { new: true });
    const todos = await renderTodos();
    res.render('required-fields', {
        layout: 'application', 
        todos: todos,
    });
});

app.get('/edit-required-fields/:id', async (req, res) => {
    const todos = await renderTodos();

    res.render('edit-required-field', {
        layout: 'application', 
        todos: todos,
    });
});

app.get('/todos/edit-page/:id', async (req, res) => {
    await Todo.updateMany({}, { edit: false, foundTodo: false }, { new: true });
    await Todo.findByIdAndUpdate(req.params.id, { edit: true }, {new: true}).lean();
    const currentTodo = await Todo.findById(req.params.id);
    const todos = await renderTodos();

    res.render('edit-todo-page', {
        layout: 'application', 
        todos: todos,
        currentTodo: currentTodo,
    });
});

app.get('/todos/search-page', async (req, res) => {
    await Todo.updateMany({}, { edit: false }, { new: true });
    const todos = await renderTodos();

    res.render('searchTodoPage', {
        layout: 'application',
        todos: todos,
    })
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

// Fetch a speific item
app.get('/todos/title', async (req, res) => {
    try {
        const foundTodos = await Todo.updateMany({ title: req.query.title }, { foundTodo: true }, { new: true });
        if (!foundTodos) {
            res.status(404).json({ error: 'Todo not found' });
        };
        console.log(foundTodos);
        res.status(200).redirect('/todos/search-page'); 
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

    if (!reqObj.title) {
        const error = JSON.stringify( { errors: { title: "required" } });
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

//COMPLETE A TODO
app.post('/todos/complete/:id', async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if(todo.completed) {
            await Todo.findByIdAndUpdate(req.params.id, { completed: false }, { new: true });
        } else if(!todo.completed) {
            await Todo.findByIdAndUpdate(req.params.id, { completed: true }, { new: true });
        };
        if (!todo) {
            res.status(404).send('Todo not found');
            return;
        };
        const documents = await Todo.find().lean();
        console.log(documents);
        res.status(200).redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error while completing the todo');
    }
});

//DELETE A TODO
app.post('/todos/delete/:id', async (req, res) => {
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

async function renderTodos() {
    const todos = [];
    const documents = await Todo.find().lean();
    const documentCount = await Todo.countDocuments();

    for(let i = 0; i < documentCount; i++) {
        todos.push(documents[i]);
    };

    return todos;
};