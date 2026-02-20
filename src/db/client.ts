import mongoose from 'mongoose';
import { logEvent, logger } from '../utils/logger.js';

// Initialize database connection
export const initializeDb = async () => {
	const mongoUri = process.env.MONGO_URI_RW;

	if (!mongoUri) {
		throw new Error('MONGO_URI_RW environment variable is not set');
	}

	try {
		logEvent(
			logger,
			'db.connection.testing',
			{ data: {} },
			'Connecting to MongoDB',
		);

		await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 5000,
			connectTimeoutMS: 5000,
		});

		logEvent(
			logger,
			'db.connection.success',
			{ data: {} },
			'MongoDB connection successful',
		);
	} catch (error) {
		logEvent(
			logger,
			'db.connection.failed',
			{
				error: {
					type: error instanceof Error ? error.name : 'Error',
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				},
			},
			'MongoDB connection failed',
		);
		throw error;
	}
};

// Health check function
export const checkDbHealth = async () => {
	try {
		const state = mongoose.connection.readyState;
		const stateMap: Record<number, string> = {
			0: 'disconnected',
			1: 'connected',
			2: 'connecting',
			3: 'disconnecting',
		};

		if (state !== 1) {
			return {
				status: 'unhealthy',
				error: `MongoDB is ${stateMap[state] || 'unknown'}`,
			};
		}

		// Ping the database
		await mongoose.connection.db?.admin().ping();

		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
};

// Close database connection
export const closeDb = async () => {
	await mongoose.connection.close();
	logEvent(
		logger,
		'db.connection.closed',
		{ data: {} },
		'MongoDB connection closed',
	);
};
