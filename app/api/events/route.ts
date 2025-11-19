import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

import connectDB from '@/lib/mongodb';
import Event from '@/database';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();

    let event;

    try {
      event = Object.fromEntries(formData.entries());
    } catch (e) {
      return NextResponse.json(
        { message: 'Invalid JSON Data format' },
        { status: 400 },
      );
    }

    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'Image is required' },
        { status: 400 },
      );
    }

    let tags = JSON.parse(formData.get('tags') as string);
    let agenda = JSON.parse(formData.get('agenda') as string);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'image',
            folder: 'DevEvent',
          },
          (err, results) => {
            if (err) return reject(error);
            resolve(results);
          },
        )
        .end(buffer);
    });

    event.image = (uploadResult as { secure_url: string }).secure_url;

    const createdEvent = await Event.create({
      ...event,
      tags: tags,
      agenda: agenda,
    });
    return NextResponse.json(
      {
        message: 'Event created Successfully',
        event: createdEvent,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      message: 'Event creation failed',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }
}

export async function GET() {
  try {
    await connectDB();

    const events = await Event.find().sort({ createdAt: -1 });
    return NextResponse.json(
      {
        message: 'Events fetched successfully',
        events,
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { message: 'Event Fetching Failed', error: e },
      { status: 500 },
    );
  }
}
