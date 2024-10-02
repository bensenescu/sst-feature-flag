# SST Feature Flag

SST Feature Flag is a full feature flagging service that you can deploy into your AWS account
with only a few simple commands.

## What's a Feature Flag?

Per [openfeature.dev](https://openfeature.dev):

> Feature flags are a software development technique that allows teams to enable, disable or change
> the behavior of certain features or code paths in a product or service, without modifying the source code.

Some examples:

- A boolean flag to disable a feature that affects all users
- A boolean flag that defaults to false except for internal testers/ beta users / organizations that are added to the flag
- A structured flag (json) that has an array of white listed domains
- It also supports string and number flags but I can't really think of a use case for those. Please add some suggestions!

## OpenFeature

The API for evaluating flags is designed based on the [openfeature.dev](https://openfeature.dev) spec. This is a project that
defines a standard and sdk for flags so that people aren't tied to a specific sass vendor, oss project,
or handrolled solution.

The top priority Todo for this project is to create a provider for OpenFeature so that it is more
certain that API is standard and so that you can easily switch to / from other Feature Flag solutions.

## Prerequisites

1. Configure AWS credentials on your machine

- https://sst.dev/docs/iam-credentials/
  - This is required for SST to be able to deploy the service.

## What is Interval?

TODO: Shorten this section. Too long!

Interval is a newly OSS project for for easily building UIs. It is extremely nice for a project like this because
it handles all the boring features like authentication, users, and permissions. It also makes it much easier to build simple UIs.

The interval server is responsible for rendering data sent to it from the Interval Client we've built in this project. See [LINK TO INTERVAL CLIENT DEFINITION].

### Easy Testing: interval-sandbox.com

For ease of testing this project out, I have spun up a free sandbox you can use: https://interval-sandbox.com.

Please do not use this for any production use cases. I have this running on a small server as you can see in this repo: [LINK REPO].

I may not keep this up indefinitely so don't rely on it. However, all the interval server does is store your user information so that you can access the UI. All feature flag data will be stored in the database spun up as part of this project i.e. even if you are using this and it goes away, it shouldn't be a big deal and you can just connect the new interval server you spin up and make an account there.

### Self Hosting Interval

Here are the instructions for self hosting interval: https://github.com/interval/server

- Note: there are some optional dependencies mentioned like emails and WorkOS for enterprise features that I don't have setup in my example.

## Local Development

You likely will want to do some testing locally before deploying to your production environment.

Here are the steps to start the local development environment (if you're self hosting, use that url instead):

1. Create an account on the Interval Sandbox (or your self hosted version).

   - https://interval-sandbox.com

1. Get you Personal Development Key and copy it to your clipboard
   - https://interval-sandbox.com/dashboard/develop/keys
1. `npx sst secret set IntervalApiKey YOUR_API_KEY_HERE`
1. `sst dev`
   - Note the Api Url in the output. This will be used to call the evaluation API.

### Example Walkthroughs

#### Create a static feature flag and use Evaluation API

1. Go to https://interval-sandbox.com/dashboard/develop/ and you should `Feature Flags` as an option.
1. Create a feature flag called `test-bool-flag` with a boolean value of `true`
1. Test the evaluation API

```
curl [api_url_output_from_sst_dev]/feature-flag/evaluate \
--header 'Content-Type: application/json' \
--data '{
        "flagKey": "test-bool-flag",
        "defaultValue": false,
        "context": {}
}'
```

#### Create a dynamic feature flag and use Evaluation API

1. Create another boolean feature flag called `test-bool-flag-dynamic`, but this time make it dynamic
1. In the dynamic flag table, click the actions button (three dots) and select `Add members`
1. Add a member with an id `john` and type of `user`, set the flag value to `true` for them
1. Check if this user is in the flag with the evaluation API

```
   curl [api_url_output_from_sst_dev]/feature-flag/evaluate \
   --header 'Content-Type: application/json' \
   --data '{
   "flagKey": "test-bool-flag-dynamic",
   "defaultValue": false,
   "context": {
   "entityId": "john",
   "entityType": "user"
   }
   }'
```

- Note: this will take a few minutes the first time you do it to spin up the vpc and database

## Extra Resources
- https://openfeature.dev
- https://interval.com/docs

### Cost

- Since this currently requires Aurora Serverless which has a minimum capacity of 0.5 ACU, this will
  cost ~$1.57 per day to run the database. The rest of the costs are negligible / well under the free tier,
  but will scale with your usage as with all AWS services.
  - There is a todo item to add a cheaper database option using Cloudflare D1.
  - Thread on Aurora Serverless Pricing: https://repost.aws/questions/QUbtHMLZXiS4Kppi7KMIB5YQ/aurora-serverless-v2-minimum-cost-setup-for-development-environment

### Todos

- [ ] Create a provider for openfeature.dev
- [ ] Add percentage rollout flags
  - This would allow you to specify that you want 20% of entities to have access to a flag.
- [ ] Add option for using cloudflare for all infra
  - This should be substantially cheaper and scale to zero since you won't need RDS + a vpc.
- [ ] Add TUI so that it isn't necessary to run Interval if you don't want to.
- [ ] Add tests for core functionality
- [ ] Add flag targeting
  - This would allow you to specify that you only want a flag to be sent to users with a certain property.
  - For example, you may only want to show a new UI to users in a certain region.