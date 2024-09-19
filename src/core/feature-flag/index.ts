import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export module FeatureFlag {
  export const Flag = z.object({
    flagName: z.string(),
    mode: z.enum(["ENABLED", "DISABLED", "PREVIEW"]),
    description: z.string().min(1),
    createdAt: z.number(),
    updatedAt: z.number(),
  });

  export const Member = z.object({
    flagName: z.string(),
    entityId: z.string(),
    entityType: z.string(),
    addedAt: z.number(),
  });

  export type Flag = z.infer<typeof Flag>;
  export type Member = z.infer<typeof Member>;

  const FLAGS_TABLE = "FeatureFlag";
  const MEMBERS_TABLE = "FeatureFlagMembers";

  export const list = async (limit: number = 50, lastEvaluatedKey?: Record<string, any>) => {
    // TODO: Look up if this is the correct way to paginate in DynamoDB
    const command = new QueryCommand({
      TableName: FLAGS_TABLE,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      KeyConditionExpression: "#pk = :pk", // Add this line
      ExpressionAttributeNames: { "#pk": "flagName" }, // Add this line
      ExpressionAttributeValues: { ":pk": "FLAG" } // Add this line
    });
    const response = await docClient.send(command);
    return {
      items: response.Items as Flag[],
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  };

  export const get = async (flagName: string) => {
    const command = new GetCommand({
      TableName: FLAGS_TABLE,
      Key: { flagName },
    });
    const response = await docClient.send(command);
    return response.Item as Flag | undefined;
  };

  export const create = async (input: Omit<Flag, "createdAt" | "updatedAt">) => {
    // TODO: Make mode an enum and update Flag type
    const now = Date.now();
    const command = new PutCommand({
      TableName: FLAGS_TABLE,
      Item: {
        ...input,
        createdAt: now,
        updatedAt: now,
      },
    });
    await docClient.send(command);
  };

  export const update = async (flagName: string, input: Partial<Omit<Flag, "flagName" | "createdAt" | "updatedAt">>) => {
    // TODO: Maybe we should add a log table as well to track the state of the flag over time?
    const command = new UpdateCommand({
      TableName: FLAGS_TABLE,
      Key: { flagName },
      UpdateExpression: "set #mode = :mode, description = :description, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#mode": "mode" },
      ExpressionAttributeValues: {
        ":mode": input.mode,
        ":description": input.description,
        ":updatedAt": Date.now(),
      },
    });
    await docClient.send(command);
  };

  export const addMember = async (input: Omit<Member, "addedAt">) => {
    const command = new PutCommand({
      TableName: MEMBERS_TABLE,
      Item: {
        ...input,
        addedAt: Date.now(),
      },
    });
    await docClient.send(command);
  };

  export const removeMember = async (flagName: string, entityId: string) => {
    const command = new DeleteCommand({
      TableName: MEMBERS_TABLE,
      Key: { flagName, entityId },
    });
    await docClient.send(command);
  };

  export const getMembers = async (flagName: string) => {
    const command = new QueryCommand({
      TableName: MEMBERS_TABLE,
      KeyConditionExpression: "flagName = :flagName",
      ExpressionAttributeValues: { ":flagName": flagName },
    });
    const response = await docClient.send(command);
    return response.Items as Member[];
  };

  export const getFlagsForEntity = async (entityId: string) => {
    const command = new QueryCommand({
      TableName: MEMBERS_TABLE,
      IndexName: "byEntity",
      KeyConditionExpression: "entityId = :entityId",
      ExpressionAttributeValues: { ":entityId": entityId },
    });
    const response = await docClient.send(command);
    return response.Items as Member[];
  };
}