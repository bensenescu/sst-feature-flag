import { program } from "commander";
import { FeatureFlag } from "../core/feature-flag";

program
  .command("list")
  .description("List all feature flags")
  .option("-l, --limit <number>", "Limit the number of flags returned")
  .action(async (options) => {
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;
    const { items } = await FeatureFlag.list(limit);
    console.log(items);
  });

program
  .command("get <flagName>")
  .description("Get a specific feature flag")
  .action(async (flagName) => {
    const flag = await FeatureFlag.get(flagName);
    console.log(flag);
  });

program
  .command("create <flagName>")
  .description("Create a new feature flag")
  .option("-m, --mode <mode>", "Set the mode of the flag (ENABLED, DISABLED, PREVIEW)")
  .option("-d, --description <description>", "Set the description of the flag")
  .action(async (flagName, options) => {
    await FeatureFlag.create({
      flagName,
      mode: options.mode,
      description: options.description,
    });
    console.log(`Feature flag '${flagName}' created successfully.`);
  });

program
  .command("update <flagName>")
  .description("Update an existing feature flag")
  .option("-m, --mode <mode>", "Update the mode of the flag (ENABLED, DISABLED, PREVIEW)")
  .option("-d, --description <description>", "Update the description of the flag")
  .action(async (flagName, options) => {
    await FeatureFlag.update(flagName, {
      mode: options.mode,
      description: options.description,
    });
    console.log(`Feature flag '${flagName}' updated successfully.`);
  });

program
  .command("add-member <flagName> <entityId>")
  .description("Add a member to a feature flag")
  .option("-t, --entityType <entityType>", "Set the entity type")
  .action(async (flagName, entityId, options) => {
    await FeatureFlag.addMember({
      flagName,
      entityId,
      entityType: options.entityType,
    });
    console.log(`Member '${entityId}' added to feature flag '${flagName}' successfully.`);
  });

program
  .command("remove-member <flagName> <entityId>")
  .description("Remove a member from a feature flag")
  .action(async (flagName, entityId) => {
    await FeatureFlag.removeMember(flagName, entityId);
    console.log(`Member '${entityId}' removed from feature flag '${flagName}' successfully.`);
  });

program
  .command("get-members <flagName>")
  .description("Get all members of a feature flag")
  .action(async (flagName) => {
    const members = await FeatureFlag.getMembers(flagName);
    console.log(members);
  });

program
  .command("get-flags-for-entity <entityId>")
  .description("Get all feature flags for an entity")
  .action(async (entityId) => {
    const flags = await FeatureFlag.getFlagsForEntity(entityId);
    console.log(flags);
  });

program.parse(process.argv);
