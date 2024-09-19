/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "sst-feature-flag",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const featureFlagMembersTable = new sst.aws.Dynamo("FeatureFlagMembers", {
      fields: {
        flagName: "string",
        entityId: "string",
        metadata: "string"
      },
      // Query: is the entity assigned to the flag?
      primaryIndex: { hashKey: "entityId", rangeKey: "flagName" },
      globalIndexes: {
        // TODO: Should i event stuff the metadata in here? I don't remember how to model data in dynamodb.
        byEntity: { hashKey: "entityId", rangeKey: "metadata" },
      },
    });

    // TODO: In dev, lets just spin up postgres locally so we don't need to setup a vpc.
    const vpc = new sst.aws.Vpc("FeatureFlagVpc");
    const rds = new sst.aws.Postgres("FeatureFlagPostgres", { vpc });

    // const hono = new sst.aws.Function("Api", {
    //   url: true,
    //   handler: "src/functions/index.handler",
    //   link: [featureFlagsTable, featureFlagMembersTable],
    // });

    // return {
    //   api: hono.url,
    // };
  },
});
