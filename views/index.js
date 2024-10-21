import mongoose from 'mongoose';
import path from 'path';
import { Todo, Attachment } from '../schema.js';

const { ObjectId } = mongoose.Types;

const element = document.getElementById('delete');

element.innerHTML = 'hello';

// const deleteMethod = async () => {
//     const response = await fetch(`http://localhost:3000/todos/${targetId}`, {
//         headers: { "Content-Type": "application/json" },
//         method: "DELETE",
//     });
// };