import mongoose from 'mongoose';

export interface IRecipe extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  ingredients: string[]; // List of ingredients as strings for simplicity
  created_at: Date;
}

const RecipeSchema = new mongoose.Schema<IRecipe>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  ingredients: { type: [String], default: [] },
  created_at: { type: Date, required: true, default: Date.now },
});

export default mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', RecipeSchema);
