import mongoose from 'mongoose';

export interface IYuiReport extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  user_message: string;
  yui_reply?: string;
  suggested_actions?: any[];
  expected_behavior: string;
  context_snapshot?: any;
  status: 'pending' | 'reviewed' | 'trained';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const YuiReportSchema = new mongoose.Schema<IYuiReport>(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_message: { type: String, required: true },
    yui_reply: { type: String, default: '' },
    suggested_actions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    expected_behavior: { type: String, required: true },
    context_snapshot: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'reviewed', 'trained'], default: 'pending' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

YuiReportSchema.index({ user_id: 1, createdAt: -1 });
YuiReportSchema.index({ status: 1 });

if (mongoose.models.YuiReport) {
  delete mongoose.models.YuiReport;
}
export default mongoose.model<IYuiReport>('YuiReport', YuiReportSchema);
