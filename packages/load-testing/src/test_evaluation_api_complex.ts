import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    // { duration: '1s', target: 1 },
    { duration: "30s", target: 500 },
  ],
};

// This will be in output of `sst dev` and `sst deploy`. It is the domain that this API is deployed to.
const baseUrl = "ENTER_API_URL_HERE";
const params = {
  headers: {
    "Content-Type": "application/json",
  },
};

const STATIC_VALUE_MAP = {
  BOOLEAN: true,
  STRING: "test_string",
  NUMBER: 3,
  STRUCTURED: { foo: "bar" },
};

const getTypeAndStaticValue = (i: number) => {
  switch (i % 4) {
    case 0:
      return { type: "BOOLEAN", staticValue: STATIC_VALUE_MAP["BOOLEAN"] };
    case 1:
      return { type: "STRING", staticValue: STATIC_VALUE_MAP["STRING"] };
    case 2:
      return { type: "NUMBER", staticValue: STATIC_VALUE_MAP["NUMBER"] };
    case 3:
      return {
        type: "STRUCTURED",
        staticValue: STATIC_VALUE_MAP["STRUCTURED"],
      };
    default:
      throw new Error("Invalid index");
  }
};

export async function setup() {
  // Create flags with random 10 character names and varied types
  const numFlags = 50;
  const flagKeyValues: Record<string, any> = {};
  for (let i = 0; i < numFlags; i++) {
    if (i % 10 === 0) {
      console.log(`Creating feature flag ${i} of ${numFlags}`);
    }
    const flagKey = Math.random().toString(36).substring(2, 12);
    const { type, staticValue } = getTypeAndStaticValue(i);

    await http.post(
      `${baseUrl}/feature-flag/admin`,
      JSON.stringify({
        flagKey,
        description: "Test flag",
        type,
        isStatic: true,
        staticValue,
      }),
      params,
    );

    flagKeyValues[flagKey] = staticValue;
    sleep(0.1);
  }
  return flagKeyValues;
}

export default async function (flagKeyValues: Record<string, any>) {
  const flagKeys = Object.keys(flagKeyValues);
  // Call 10 feature flags randomly
  const randomFlagKeys = flagKeys.sort(() => 0.5 - Math.random()).slice(0, 10);

  for (const flagKey of randomFlagKeys) {
    const payload = JSON.stringify({
      flagKey: flagKey,
      defaultValue: flagKeyValues[flagKey], // Use actual value as default for simplicty. We check the reason below so it's fine that these are the same.
      context: {},
    });

    const res = await http.post(
      `${baseUrl}/feature-flag/evaluate`,
      payload,
      params,
    );

    const expectedValue = flagKeyValues[flagKey];

    check(res, {
      "success evaluation": (r) => {
        const res = r.json() as { body?: string };
        const data = JSON.parse(res?.body || "{}");
        const isSuccess =
          r.status === 200 &&
          JSON.stringify(data) ===
            JSON.stringify({ value: expectedValue, reason: "STATIC" });
        if (!isSuccess) {
          console.error(
            `Evaluation failed for flag ${flagKey}: STATUS ${r.status} BODY ${JSON.stringify(data)}`,
          );
        }
        return isSuccess;
      },
    });
  }

  sleep(1);
}

export async function teardown(flagKeyValues: Record<string, any>) {
  const flagKeys = Object.keys(flagKeyValues);

  // Delete all feature flags
  console.log(`Deleting ${flagKeys.length} feature flags`);
  for (let i = 0; i < flagKeys.length; i++) {
    const flagKey = flagKeys[i];
    if (i % 10 === 0) {
      console.log(`Deleting feature flag ${i + 1} of ${flagKeys.length}`);
    }
    await http.del(`${baseUrl}/feature-flag/admin/${flagKey}`);
    sleep(0.1);
  }
}
