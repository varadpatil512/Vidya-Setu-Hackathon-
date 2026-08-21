import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: {
    type: String,
    required: function () {
      return this.authProvider === 'local';
    },
    minlength: 6,
  },
  role: { type: String, enum: ROLES, default: 'STUDENT' },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, sparse: true },
  avatar: { type: String },
}, { timestamps: true });

userSchema.methods.matchPassword = function (plain) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model('User', userSchema);
