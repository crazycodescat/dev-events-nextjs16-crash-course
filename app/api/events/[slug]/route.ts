import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import Event from '@/database';
import connectDB from '@/lib/mongodb';

// Ensure this route runs in the Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';

interface GetEventParams {
  params: Promise<{
    slug: string;
  }>;
}

// GET /api/events/[slug] - returns a single event by slug
export async function GET(
  _request: Request,
  context: GetEventParams,
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;
    console.log(slug, 22);

    // Validate presence and format of slug
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Slug is required.' },
        { status: 400 },
      );
    }

    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      return NextResponse.json(
        { success: false, message: 'Slug cannot be empty.' },
        { status: 400 },
      );
    }

    // Basic slug format validation: lowercase letters, numbers, dashes
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(normalizedSlug)) {
      return NextResponse.json(
        { success: false, message: 'Invalid slug format.' },
        { status: 400 },
      );
    }

    await connectDB();

    const eventDoc = await Event.findOne({ slug: normalizedSlug })
      .lean()
      .exec();

    if (!eventDoc) {
      return NextResponse.json(
        { success: false, message: 'Event not found.' },
        { status: 404 },
      );
    }

    // Return event data as plain JSON
    return NextResponse.json(
      {
        success: true,
        eventDoc,
        message: 'Event fetched successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV !== 'development') {
      console.error('Error fetching event by slug:', error);
    }

    if (error instanceof Error) {
      if (error.message.includes('MONGODB_URI')) {
        return NextResponse.json(
          { message: 'Database configuration error' },
          { status: 500 },
        );
      }

      // Return generic error with error message
      return NextResponse.json(
        {
          message: 'Failed to fetch event',
          error: error.message,
        },
        { status: 500 },
      );
    }
    // Generic error response without leaking internals
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
