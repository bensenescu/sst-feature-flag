import { Resource } from "sst";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";

const client = new RDSDataClient({});

export const db = drizzle(client, {
  database: Resource.FeatureFlagPostgres.database,
  secretArn: Resource.FeatureFlagPostgres.secretArn,
  resourceArn: Resource.FeatureFlagPostgres.clusterArn,
});
