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

    // TODO: Need to figure out how to set up Interval's postgres. Maybe just manually create the db
    // and run this command to bootstrap it: `interval-server db-init --skip-create`.
    //   new docker.Container("IntervalPostgresLocal", {
    //     name: "interval-postgres-local",
    //     image: "postgres:latest",
    //     envs: [
    //       $interpolate`POSTGRES_USER=${db.username}`,
    //       $interpolate`POSTGRES_PASSWORD=${db.password}`,
    //       $interpolate`POSTGRES_DB=${db.database}`,
    //     ],
    //   });
    //   intervalPostgresDBString = $resolve({
    //     username: db.username,
    //     password: db.password,
    //     database: db.database
    //   }).apply(({ username, password, database }) =>
    //     console.log(`postgres://${username}:${password}@localhost:5432/${database}`)
    //   );
    // } else {
    //   intervalPostgresDBString = "production";
    // }

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
