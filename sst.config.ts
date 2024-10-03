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
    const intervalApiKey = new sst.Secret(
      "IntervalApiKey",
      "GET_API_KEY_FROM_INTERVAL_DASHBOARD",
    );
    const intervalServerEndpoint = new sst.Secret(
      "IntervalServerEndpoint",
      // This is the default endpoint for running Interval Server locally. If you're self hosting, set that as the value instead using `sst secret set`
      "wss://interval-sandbox.com/websocket",
    );

    // TODO: Should we allow people to optionally specify a vpc?
    const vpc = new sst.aws.Vpc("FeatureFlagVpc");
    const db = new sst.aws.Postgres("FeatureFlagPostgres", { vpc });


    const api = new sst.aws.Function("FeatureFlagApi", {
      handler: "./packages/functions/src/index.handler",
      link: [db],
      url: true,
      streaming: !$dev,
    });
    const cluster = new sst.aws.Cluster("IntervalCluster", { vpc });

    cluster.addService("IntervalApp", {
      link: [db, intervalApiKey, intervalServerEndpoint],
      image: {
        dockerfile: "packages/interval/Dockerfile",
      },
      dev: {
        command: "bun dev",
      },
    });

    return {
      Api: api.url,
    };
  },
});
