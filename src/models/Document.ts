import mongoose, { Schema, Document as MongooseDocument, Model } from "mongoose";

export interface IDocument extends MongooseDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string; // TipTap HTML or JSON string
  ownerId: string;
  sharedWith: string[];
  viewers?: string[];
  generalAccess?: "restricted" | "anyoneWithLink";
  generalAccessRole?: "viewer" | "editor";
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      default: "Untitled Document",
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      default: "<p>Start writing your document...</p>",
    },
    ownerId: {
      type: String,
      required: [true, "Document owner ID is required"],
      index: true,
    },
    sharedWith: {
      type: [String],
      default: [],
      index: true,
    },
    viewers: {
      type: [String],
      default: [],
    },
    generalAccess: {
      type: String,
      enum: ["restricted", "anyoneWithLink"],
      default: "restricted",
    },
    generalAccessRole: {
      type: String,
      enum: ["viewer", "editor"],
      default: "viewer",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant access queries
DocumentSchema.index({ ownerId: 1, updatedAt: -1 });
DocumentSchema.index({ sharedWith: 1, updatedAt: -1 });

const DocumentModel: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);

export default DocumentModel;
