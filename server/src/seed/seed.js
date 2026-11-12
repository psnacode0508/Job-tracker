import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Application from '../models/Application.js';

dotenv.config();

const BASE_COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Apple', 'Netflix',
  'Microsoft', 'Stripe', 'Airbnb', 'Uber', 'Spotify',
  'Linear', 'Vercel', 'Datadog', 'Figma', 'Notion',
  'Slack', 'Twilio', 'OpenAI', 'Anthropic', 'Snowflake',
  'Shopify', 'Coinbase', 'GitHub', 'GitLab', 'Atlassian'
];

const ROLES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Mobile Engineer (iOS/Android)',
  'Product Designer',
  'Engineering Manager',
  'Solutions Architect',
  'Data Engineer',
  'Cloud Infrastructure Engineer'
];

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const SAMPLE_NOTES = [
  'Submitted application with tailored resume.',
  'Recruiter reached out on LinkedIn for initial phone screen.',
  'Technical screen scheduled for next Tuesday.',
  'Completed take-home assignment and submitted PR.',
  'System design round completed with hiring manager.',
  'Behavioral interview went well; awaiting feedback.',
  'Received competitive offer package with equity component.',
  'Politely declined offer; counter-offer received.'
];

async function seedDatabase() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error('Error: Missing MONGODB_URI / MONGO_URI environment variable.');
      process.exit(1);
    }

    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully.');

    // 1. Clear existing collections
    console.log('Clearing existing Users and Applications...');
    await User.deleteMany({});
    await Application.deleteMany({});
    console.log('Existing collections cleared.');

    // 2. Create 2 users
    const user1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      password: 'Password123!',
      role: 'admin',
    });

    const user2 = await User.create({
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      password: 'Password123!',
      role: 'user',
    });

    console.log(`Created User 1 (Alice): ${user1._id}`);
    console.log(`Created User 2 (Bob):   ${user2._id}`);

    // 3. Generate 1,000 randomized job applications
    console.log('Generating 1,000 randomized job applications...');
    const applicationsToInsert = [];

    for (let i = 1; i <= 1000; i++) {
      // Assign actual Mongoose ObjectId (user1._id or user2._id)
      const owner = i % 2 === 0 ? user1._id : user2._id;

      const companyBase = BASE_COMPANIES[i % BASE_COMPANIES.length];
      const role = ROLES[i % ROLES.length];
      const company = `${companyBase} (Batch ${Math.ceil(i / BASE_COMPANIES.length)})`;

      // Distribute all 4 statuses evenly across each owner (~125 per status per owner)
      const status = STATUSES[Math.floor((i - 1) / 2) % STATUSES.length];

      const priority = PRIORITIES[i % PRIORITIES.length];
      const salary = Math.floor(Math.random() * (180000 - 50000 + 1)) + 50000;

      // Random past date within the last 180 days
      const daysAgo = Math.floor(Math.random() * 180);
      const appliedOn = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // 1-3 random notes
      const noteCount = (i % 3) + 1;
      const notes = [];
      for (let n = 0; n < noteCount; n++) {
        notes.push({
          text: SAMPLE_NOTES[(i + n) % SAMPLE_NOTES.length],
          createdAt: new Date(appliedOn.getTime() + n * 86400000),
        });
      }

      applicationsToInsert.push({
        owner,
        company,
        role,
        status,
        appliedOn,
        priority,
        salary,
        notes,
      });
    }

    await Application.insertMany(applicationsToInsert);
    console.log('Successfully inserted 1,000 job applications.');

    // 4. Run explain('executionStats') benchmark
    console.log('\nRunning query explain("executionStats") for { owner: user1._id, status: "Interview" }...');
    const explainResult = await Application.find({
      owner: user1._id,
      status: 'Interview',
    }).explain('executionStats');

    const executionStats = explainResult.executionStats;
    const indexStage = executionStats.executionStages.inputStage?.stage || executionStats.executionStages.stage;
    const outerStage = executionStats.executionStages.stage;
    const totalDocsExamined = executionStats.totalDocsExamined;
    const nReturned = executionStats.nReturned;
    const executionTimeMillis = executionStats.executionTimeMillis;

    console.log('\n================ EXPLAIN STATS ================');
    console.log(`Index Stage:         ${indexStage}`);
    console.log(`Outer Stage:         ${outerStage}`);
    console.log(`totalDocsExamined:   ${totalDocsExamined}`);
    console.log(`nReturned:           ${nReturned}`);
    console.log(`executionTimeMillis: ${executionTimeMillis}ms`);
    console.log('===============================================\n');

    // Verify non-zero returned and examined counts
    if (nReturned === 0) {
      console.warn('Warning: nReturned is 0! Expected non-zero (~125 matching documents).');
    } else {
      console.log(`Verification Passed: nReturned (${nReturned}) and totalDocsExamined (${totalDocsExamined}) are non-zero.`);
    }

    await mongoose.disconnect();
    console.log('MongoDB disconnected. Seed process completed.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

seedDatabase();
