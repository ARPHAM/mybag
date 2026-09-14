import mongoose from 'mongoose';

export interface ICalendarEvent extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  color_code?: string;
  
  // Recurring fields
  is_recurring: boolean;
  recurrence_type?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrence_days?: number[]; // [0,1,2,3,4,5,6] for Sunday to Saturday
  recurrence_end?: Date;

  // Exception fields
  parent_event_id?: mongoose.Types.ObjectId;
  exception_date?: Date;
  is_cancelled?: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new mongoose.Schema<ICalendarEvent>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  color_code: { type: String },

  is_recurring: { type: Boolean, default: false },
  recurrence_type: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
  recurrence_days: { type: [Number], default: [] },
  recurrence_end: { type: Date },

  parent_event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CalendarEvent' },
  exception_date: { type: Date },
  is_cancelled: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.CalendarEvent || mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
