/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
import "sst"
export {}
declare module "sst" {
  export interface Resource {
    "FeatureFlagApi": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "FeatureFlagPostgres": {
      "clusterArn": string
      "database": string
      "host": string
      "password": string
      "port": number
      "secretArn": string
      "type": "sst.aws.Postgres"
      "username": string
    }
    "FeatureFlagVpc": {
      "type": "sst.aws.Vpc"
    }
    "IntervalApiKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "IntervalApp": {
      "service": string
      "type": "sst.aws.Service"
    }
    "IntervalServerEndpoint": {
      "type": "sst.sst.Secret"
      "value": string
    }
  }
}
