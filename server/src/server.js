
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const port = Number(process.env.PORT) || 5000;

function classifyMongoFailure(error) {
  const servers = [
    ...(error?.reason?.servers?.values?.() || []),
  ];

  const nested = [
    error,
    error?.cause,
    ...servers.map((server) => server.error),
  ];

  const codes = nested
    .map((item) => item?.code)
    .filter(Boolean);

  if (
    codes.some(
      (code) =>
        code === 18 ||
        code === 8000 ||
        code === 'EAUTH'
    ) ||
    nested.some((item) => item?.codeName === 'Unauthorized')
  ) {
    return 'Authentication rejected. Check the Atlas database username and password.';
  }

  if (
    codes.some((code) =>
      ['ENOTFOUND', 'EAI_AGAIN'].includes(code)
    )
  ) {
    return 'DNS lookup failed. Check the Atlas cluster hostname.';
  }

  if (
    codes.some((code) =>
      ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(code)
    )
  ) {
    return 'Network connection failed. Check DNS, Atlas network access, and cluster availability.';
  }

  if (error?.name?.includes('ServerSelection')) {
    return 'Server selection timed out. Check Atlas network access and cluster availability.';
  }

  return 'Connection failed. Check the URI, credentials, and Atlas configuration.';
}

// Validate required production environment variables.
if (
  process.env.NODE_ENV === 'production' &&
  (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    !process.env.MONGODB_URI
  )
) {
  throw new Error(
    'Production requires a SESSION_SECRET of at least 32 characters and a MONGODB_URI.'
  );
}

// Connect to MongoDB Atlas.
if (process.env.MONGODB_URI) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    globalThis.mongoReady = true;
    console.log('MongoDB connected successfully.');
  } catch (error) {
    globalThis.mongoReady = false;

    console.error('MongoDB connection failed.');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Failure category:', classifyMongoFailure(error));

    if (error.cause) {
      console.error('Underlying cause:', error.cause.message);
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('MongoDB connection failed in production.', {
        cause: error,
      });
    }

    console.warn(
      'Running sample-case mode with temporary storage. Cases will not persist.'
    );
  }
} else {
  globalThis.mongoReady = false;

  console.warn(
    'MONGODB_URI is unset; using temporary in-memory case storage.'
  );
}

// Start the API server.
const apiServer = app.listen(port, () => {
  console.log(
    `AI Mystery Room API listening on http://localhost:${port}`
  );
});

apiServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. Stop the other server or set a different PORT.`
    );
  } else {
    console.error(`API server failed to start: ${error.message}`);
  }

  process.exit(1);
});
