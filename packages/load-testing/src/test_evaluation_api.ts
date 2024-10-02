import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    // { duration: '2s', target: 1 },
    { duration: "10s", target: 100 },
  ],
};

const FLAG_KEY = "k9-bool";
// This will be in output of `sst dev` and `sst deploy`. It is the domain that this API is deployed to.
const baseUrl = "ENTER_API_URL_HERE";
const params = {
  headers: {
    "Content-Type": "application/json",
  },
};

export async function setup() {
  await http.post(
    `${baseUrl}/feature-flag/admin`,
    JSON.stringify({
      flagKey: FLAG_KEY,
      description: "Test flag",
      type: "BOOLEAN",
      isStatic: true,
      staticValue: true,
    }),
    params,
  );
}

export default async function () {
  const payload = JSON.stringify({
    flagKey: FLAG_KEY,
    defaultValue: false,
    context: {},
  });

  const res = await http.post(
    `${baseUrl}/feature-flag/evaluate`,
    payload,
    params,
  );

  check(res, {
    "success evaluation": (r) => {
      const isSuccess = r.status === 200;
      const isExpectedResponse =
        r.body === JSON.stringify({ value: true, reason: "STATIC" });
      if (!isSuccess || !isExpectedResponse) {
        console.log(`STATUS: ${r.status} BODY: ${r.body}`);
      }
      return isSuccess && isExpectedResponse;
    },
  });
  sleep(1);
}

export async function teardown() {
  await http.del(`${baseUrl}/feature-flag/admin/${FLAG_KEY}`);
}
