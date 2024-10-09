import mongoose from 'mongoose';

// MongoDB models
const TodoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueAt: Date,
});

const Todo = mongoose.model('Todo', TodoSchema);

const AttachmentSchema = new mongoose.Schema({
  todoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Todo', required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  storagePath: { type: String, required: true },
});

const Attachment = mongoose.model('Attachment', AttachmentSchema);

export { Todo, Attachment };
