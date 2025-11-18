import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import Event from './event.model';

// Strongly typed Booking document
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Additional index on eventId to optimize event-based queries
BookingSchema.index({ eventId: 1 });

// Simple email validation regex for common email formats
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pre-save hook: validate email and ensure referenced event exists
BookingSchema.pre<IBooking>('save', async function preSave(next) {
  const booking = this;

  // Normalize and validate email format
  const email = booking.email ? booking.email.trim().toLowerCase() : '';
  if (!email || !emailRegex.test(email)) {
    return next(new Error('Invalid email address.'));
  }
  booking.email = email;

  // Ensure the referenced event exists before creating the booking
  try {
    const eventExists = await Event.exists({ _id: booking.eventId });
    if (!eventExists) {
      return next(new Error('Referenced event does not exist.'));
    }
  } catch (error) {
    return next(error instanceof Error ? error : new Error('Failed to validate event reference.'));
  }

  return next();
});

// Reuse existing model in dev to avoid OverwriteModelError in Next.js
export const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking> | undefined) ||
  mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
