import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Policy } from './entities/policy.entity';
import { Premium } from './entities/premium.entity';
import { Claim } from './entities/claim.entity';
import { Proposal } from './entities/proposal.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Policy, Premium, Claim, Proposal],
  synchronize: true,
});

function readJson(filename: string): any[] {
  const file = path.join(__dirname, '../../frontend/public/assets/mock-data', filename);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  await dataSource.getRepository(Policy).save(readJson('policies.json'));
  console.log('✔ Policies seeded');

  await dataSource.getRepository(Premium).save(readJson('premium.json'));
  console.log('✔ Premiums seeded');

  await dataSource.getRepository(Claim).save(readJson('claims.json'));
  console.log('✔ Claims seeded');

  await dataSource.getRepository(Proposal).save(readJson('proposals.json'));
  console.log('✔ Proposals seeded');

  await dataSource.destroy();
  console.log('Done');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
