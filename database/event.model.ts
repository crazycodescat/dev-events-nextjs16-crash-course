import mongoose, { Schema, Document, Model } from 'mongoose';

// Strongly typed Event document
interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // stored as ISO date string (YYYY-MM-DD)
  time: string; // stored as 24h time string (HH:mm)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Simple slug generator: lowercases, removes invalid chars, collapses dashes
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true },
  },
  {
    timestamps: true,
    strict: true,
  },
);

// Unique index on slug for fast lookups and enforcing uniqueness
EventSchema.index({ slug: 1 }, { unique: true });

// Pre-save hook: validate required fields, normalize date & time, and generate slug
EventSchema.pre<IEvent>('save', function preSave(next) {
  const event = this;

  // Ensure required string fields are present and non-empty
  const requiredStringFields: Array<
    keyof Pick<
      IEvent,
      | 'title'
      | 'description'
      | 'overview'
      | 'image'
      | 'venue'
      | 'location'
      | 'date'
      | 'time'
      | 'mode'
      | 'audience'
      | 'organizer'
    >
  > = [
    'title',
    'description',
    'overview',
    'image',
    'venue',
    'location',
    'date',
    'time',
    'mode',
    'audience',
    'organizer',
  ];

  for (const field of requiredStringFields) {
    const rawValue: unknown = event[field];
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!value) {
      return next(
        new Error(`Field "${String(field)}" is required and cannot be empty.`),
      );
    }
    // Normalize by trimming whitespace
    (event as never)[field] = value as never;
  }

  // Validate required array fields are present and non-empty
  const requiredArrayFields: Array<keyof Pick<IEvent, 'agenda' | 'tags'>> = [
    'agenda',
    'tags',
  ];

  for (const field of requiredArrayFields) {
    const rawValue: unknown = event[field];
    if (!Array.isArray(rawValue) || rawValue.length === 0) {
      return next(
        new Error(`Field "${String(field)}" is required and cannot be empty.`),
      );
    }

    const normalizedArray = rawValue.map((item) => {
      if (typeof item !== 'string') {
        return '';
      }
      return item.trim();
    });

    if (normalizedArray.some((item) => !item)) {
      return next(
        new Error(
          `Field "${String(field)}" must be a non-empty array of non-empty strings.`,
        ),
      );
    }

    (event as never)[field] = normalizedArray as never;
  }

  // Generate slug from title only when title is new or changed
  if (event.isNew || event.isModified('title')) {
    event.slug = generateSlug(event.title);
  }

  // Normalize date to ISO format (YYYY-MM-DD)
  const parsedDate = new Date(event.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return next(
      new Error('Invalid date format. Please provide a valid date string.'),
    );
  }
  event.date = parsedDate.toISOString().split('T')[0];

  // Normalize time to 24-hour HH:mm format
  const timeInput = event.time.trim();
  const timeMatch = /^([0-9]{1,2}):([0-9]{2})$/.exec(timeInput);
  if (!timeMatch) {
    return next(
      new Error('Invalid time format. Expected HH:mm in 24-hour format.'),
    );
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return next(
      new Error('Invalid time value. Hours must be 0-23 and minutes 0-59.'),
    );
  }

  event.time = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;

  return next();
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema);

export { IEvent };
