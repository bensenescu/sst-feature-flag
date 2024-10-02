// TODO: why isn't this being imported properly?
import { Resource } from "sst";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  driver: "aws-data-api",
  dialect: "postgresql",
  dbCredentials: {
    database: Resource.FeatureFlagPostgres.database,
    secretArn: Resource.FeatureFlagPostgres.secretArn,
    resourceArn: Resource.FeatureFlagPostgres.clusterArn,
  },
  // Pick up all our schema files
  schema: ["./src/**/*.sql.ts"],
  out: "./migrations",
});
