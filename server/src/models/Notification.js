import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['approval', 'rejection'], required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
