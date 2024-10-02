import { FeatureFlagEvaluation } from "@sst-feature-flag/core/feature-flag-evaluation/index";
import { FeatureFlag } from "@sst-feature-flag/core/feature-flag/index";
import { Hono } from "hono";
import { z } from "zod";

export module FeatureFlagEvaluationApi {
  export const route = new Hono().post("/", async (c) => {
    const body = await c.req.json();
    const { flagKey, defaultValue, context } = z
      .object({
        flagKey: z.string(),
        defaultValue: z.any(),
        context: z.any(),
      })
      .parse(body);

    if (!flagKey) {
      return c.text("flagKey is required", 400);
    }

    const evalDecision = await FeatureFlagEvaluation.genericFlagEvaluation(
      flagKey,
      defaultValue,
      context,
    );
    // const { items } = await FeatureFlag.list({ isStatic: true });
    return c.json(evalDecision);
    // return c.json({
    //   result: items.map(item => ({
    //     ...item,
    //     booleanValue: item.booleanValue ?? undefined,
    //     stringValue: item.stringValue ?? undefined,
    //     numberValue: item.numberValue ?? undefined,
    //     structuredValue: item.structuredValue ?? undefined,
    //     createdAt: Number(item.createdAt),
    //     updatedAt: Number(item.updatedAt),
    //   }))
    // })
  });
  // .post("/", async (c) => {
  //   const input = await c.req.json();
  //   const [flag] = await FeatureFlag.create(input);

  //   const responseFlag = {
  //     ...flag,
  //     // TODO: Figure out how to unify these types. I think Drizzle is converting the types under the hood.
  //     createdAt: Number(flag.createdAt),
  //     updatedAt: Number(flag.updatedAt),
  //     booleanValue: flag.booleanValue ?? undefined,
  //     stringValue: flag.stringValue ?? undefined,
  //     numberValue: flag.numberValue ?? undefined,
  //     structuredValue: flag.structuredValue ?? undefined
  //   };
  //   return c.json(responseFlag, 201);
  // })
}
