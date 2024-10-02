import { FeatureFlag } from "@sst-feature-flag/core/feature-flag/index";
import { Hono } from "hono";
import { z } from "zod";

export module FeatureFlagAdminApi {
  export const route = new Hono()
    .get("/list", async (c) => {
      const { items } = await FeatureFlag.list({ isStatic: true });
      return c.json({
        result: items,
      });
    })
    .post("/", async (c) => {
      const input = await c.req.json();
      const parsedInput = z
        .object({
          flagKey: z.string(),
          description: z.string(),
          type: z.enum(["BOOLEAN", "STRING", "NUMBER", "STRUCTURED"]),
          isStatic: z.boolean(),
          staticValue: z.any().optional(),
        })
        .parse(input);

      const valueMap = FeatureFlag.generateValueMap(
        parsedInput.type,
        parsedInput.staticValue,
      );

      await FeatureFlag.create({
        flagKey: parsedInput.flagKey,
        description: parsedInput.description,
        valueType: parsedInput.type,
        isStatic: parsedInput.isStatic,
        ...valueMap,
      });

      return c.text("OK");
    })
    .delete("/:flagKey", async (c) => {
      const { flagKey } = c.req.param();
      await FeatureFlag.__delete_test_flag(flagKey);
      return c.text("OK");
    });
}
