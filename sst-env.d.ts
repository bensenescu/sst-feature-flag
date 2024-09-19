/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    FeatureFlagMembers: {
      name: string
      type: "sst.aws.Dynamo"
    }
    FeatureFlagPostgres: {
      clusterArn: string
      database: string
      secretArn: string
      type: "sst.aws.Postgres"
    }
  }
}
export { }