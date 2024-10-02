import { Interval } from "@interval/sdk";
import { Resource } from "sst";
import FeatureFlags from "./routes/feature-flags";

const interval = new Interval({
  apiKey: Resource.IntervalApiKey.value,
  routes: {
    featureFlags: FeatureFlags,
  },
  endpoint: Resource.IntervalServerEndpoint.value,
});

interval.listen();
