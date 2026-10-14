import mongoose, { Schema, Document as MongooseDocument, Model } from "mongoose";

export interface IUser extends MongooseDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  avatarColor: string;
  initials: string;
  roleTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [120, "Email cannot exceed 120 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    avatarColor: {
      type: String,
      default: "bg-blue-600",
    },
    initials: {
      type: String,
      default: "U",
    },
    roleTitle: {
      type: String,
      default: "Member",
    },
  },
  {
    timestamps: true,
  }
);

const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default UserModel;
