import { FeatureFlag } from "@sst-feature-flag/core/feature-flag/index";
import { isJsonString } from "@sst-feature-flag/core/utils";
import { Action, ctx, io, Layout, Page } from "@interval/sdk";
import { MaybeOptionalGroupIOPromise } from "@interval/sdk/dist/types";

const staticValueHelpText =
  "This value will be the value of the feature flag for all entities.";
const dynamicValueHelpText =
  "This value will be the value of the feature flag for the currently selected entities.";

const getValueInput = ({
  isStatic,
  valueType,
  staticValueMap,
}: {
  isStatic: boolean;
  valueType: string;
  staticValueMap?: {
    booleanValue?: boolean;
    stringValue?: string;
    numberValue?: number;
    structuredValue?: string;
  };
}): MaybeOptionalGroupIOPromise => {
  switch (valueType.toUpperCase()) {
    case "BOOLEAN":
      return io.select.single(isStatic ? "Static Value" : "Dynamic Value", {
        helpText: isStatic ? staticValueHelpText : dynamicValueHelpText,
        options: ["True", "False"],
        defaultValue: staticValueMap?.booleanValue === true ? "True" : "False",
      });
    case "STRING":
      return io.input.text(isStatic ? "Static Value" : "Dynamic Value", {
        helpText: isStatic ? staticValueHelpText : dynamicValueHelpText,
        defaultValue: staticValueMap?.stringValue,
      });
    case "NUMBER":
      return io.input.number(isStatic ? "Static Value" : "Dynamic Value", {
        helpText: isStatic ? staticValueHelpText : dynamicValueHelpText,
        defaultValue: staticValueMap?.numberValue,
      });
    case "STRUCTURED":
      return io.input
        .text(isStatic ? "Static Value" : "Dynamic Value", {
          helpText: isStatic ? staticValueHelpText : dynamicValueHelpText,
          multiline: true,
          defaultValue: staticValueMap?.structuredValue,
        })
        .validate((val) => {
          if (!isJsonString(val)) {
            return "Invalid JSON string.";
          }
        });
    default:
      throw new Error("Invalid static type");
  }
};

const handleEditFlagInput = async (flagDetails: {
  inputLabel: string;
  isStatic: boolean;
  valueType: string;
  description: string;
  flagKey: string;
  isDisabled: boolean; // Add isDisabled property
  staticValueMap?: {
    booleanValue?: boolean;
    stringValue?: string;
    numberValue?: number;
    structuredValue?: string;
  };
}) => {
  ctx.log({ flagDetails });
  if (flagDetails.isStatic) {
    const {
      choice,
      returnValue: { flagKey, description, staticValue, isDisabled }, // Add isDisabled
    } = await io
      .group({
        flagKey: io.input.text("Key", {
          defaultValue: flagDetails.flagKey,
        }),
        description: io.input.text("Description", {
          defaultValue: flagDetails.description,
          multiline: true,
        }),
        staticValue: getValueInput({
          isStatic: flagDetails.isStatic,
          valueType: flagDetails.valueType,
          staticValueMap: flagDetails.staticValueMap,
        }),
        isDisabled: io.select.single("Status", {
          // Add isDisabled input
          defaultValue: flagDetails.isDisabled ? "Disabled" : "Enabled",
          options: ["Enabled", "Disabled"],
        }),
      })
      .withChoices(["Update", "Cancel"]);

    return {
      choice,
      returnValue: {
        flagKey,
        description,
        staticValue,
        isDisabled: isDisabled === "Disabled",
      },
    }; // Map string to boolean
  }

  const {
    choice,
    returnValue: { flagKey, description, isDisabled }, // Add isDisabled
  } = await io
    .group({
      flagKey: io.input.text("Key", {
        defaultValue: flagDetails.flagKey,
      }),
      description: io.input.text("Description", {
        defaultValue: flagDetails.description,
        multiline: true,
      }),
      isDisabled: io.select.single("Status", {
        // Add isDisabled input
        defaultValue: flagDetails.isDisabled ? "Disabled" : "Enabled",
        options: ["Enabled", "Disabled"],
      }),
    })
    .withChoices(["Update", "Cancel"]);

  return {
    choice,
    returnValue: {
      flagKey,
      description,
      isDisabled: isDisabled === "Disabled",
    },
  }; // Map string to boolean
};

const renderValue = (row: {
  booleanValue: boolean | null;
  stringValue: string | null;
  numberValue: number | null;
  structuredValue: string | null;
}) => {
  let value = "";
  if (row.booleanValue !== null) {
    value = row.booleanValue ? "True" : "False";
  } else if (row.stringValue !== null) {
    value = row.stringValue ?? "";
  } else if (row.numberValue !== null) {
    value = row.numberValue?.toString() ?? "";
  } else if (row.structuredValue !== null) {
    value = JSON.stringify(row.structuredValue);
  }
  return value.length > 50 ? value.substring(0, 47) + "..." : value;
};

const renderStatus = (row: { isDisabled: boolean }) => {
  return row.isDisabled
    ? {
      label: "Disabled",
      highlightColor: "red" as const,
    }
    : {
      label: "Enabled",
      highlightColor: "green" as const,
    };
};
export default new Page({
  name: "Feature Flags",
  routes: {
    create: new Action({
      name: "Create Feature Flag",
      unlisted: true,
      handler: async () => {
        const { key, description, staticSelection, type } = await io.group({
          key: io.input.text("Key"),
          description: io.input.text("Description"),
          staticSelection: io.select.single("Dynamic or Static?", {
            defaultValue: "Dynamic",
            helpText:
              "Dynamic flags can have members which have unique flag values. Static flags are the same regardless of context passed in.",
            options: ["Dynamic" as const, "Static" as const],
          }),
          type: io.select.single("Type", {
            defaultValue: "Boolean",
            helpText:
              "Boolean flags are the most common. Other types include String, Number, and Structured if you need more granular control.",
            options: [
              "Boolean" as const,
              "String" as const,
              "Number" as const,
              "Structured" as const,
            ],
          }),
        });

        const isStatic = staticSelection === "Static";
        if (isStatic) {
          const staticValue = await getValueInput({
            isStatic,
            valueType: type,
          });
          const staticValues = FeatureFlag.generateValueMap(type, staticValue);

          await FeatureFlag.create({
            flagKey: key,
            description,
            isStatic,
            ...staticValues,
            valueType: type.toUpperCase(),
          });
        } else {
          await FeatureFlag.create({
            flagKey: key,
            description,
            isStatic,
            valueType: type.toUpperCase(),
          });
        }
        await ctx.redirect({ route: "featureFlags" });
      },
    }),
    edit: new Action({
      name: "Edit Details",
      unlisted: true,
      handler: async () => {
        if (typeof ctx?.params?.key !== "string") {
          throw new Error(
            "Please navigate to this page from the Feature Flags table instead of from the sidebar.",
          );
        }

        const flag = await FeatureFlag.get(ctx.params.key);
        if (!flag) {
          throw new Error("Feature flag not found");
        }

        const {
          choice,
          returnValue: { flagKey, description, staticValue, isDisabled },
        } = await handleEditFlagInput({
          isStatic: flag.isStatic,
          valueType: flag.valueType,
          description: flag.description,
          flagKey: flag.flagKey,
          inputLabel: flag.isStatic ? "Static Value" : "Dynamic Value",
          staticValueMap: {
            booleanValue:
              flag.booleanValue === null ? undefined : flag.booleanValue,
            stringValue: flag.stringValue ?? undefined,
            numberValue: flag.numberValue ?? undefined,
            structuredValue: flag.structuredValue ?? undefined,
          },
          isDisabled: flag.isDisabled,
        });

        if (choice === "Cancel") {
          await ctx.redirect({ route: "featureFlags" });
          return;
        }

        if (flag.isStatic) {
          const staticValues = FeatureFlag.generateValueMap(
            flag.valueType,
            staticValue,
          );
          await FeatureFlag.update(flag.flagKey, {
            flagKey,
            description,
            isDisabled,
            ...staticValues,
          });
        } else {
          await FeatureFlag.update(flag.flagKey, {
            flagKey,
            description,
            isDisabled,
          });
        }

        // Redirect to the new edit page if the key changed since the key is the url param
        if (flag.flagKey !== flagKey) {
          await ctx.redirect({
            route: "featureFlags/edit",
            params: { key: flagKey },
          });
        }
      },
    }),
    archive: new Action({
      name: "Archive",
      unlisted: true,
      handler: async () => {
        if (typeof ctx?.params?.key !== "string") {
          throw new Error(
            "Please navigate to this page from the Feature Flags table instead of from the sidebar.",
          );
        }
        const shouldArchive = await io.confirm("Archive this feature flag?", {
          helpText:
            "This feature flag will be archived. If you check if an enitity is part of this feature flag, it will return false. To undo this action, you will need to manually update the archive value in the database.",
        });

        if (!shouldArchive) {
          await ctx.redirect({ route: "featureFlags" });
          return;
        }

        await FeatureFlag.archive(ctx.params.key);
        await ctx.redirect({ route: "featureFlags" });
      },
    }),
    "view-members": new Page({
      name: "View Members",
      unlisted: true,
      handler: async () => {
        if (typeof ctx?.params?.key !== "string") {
          throw new Error(
            "Please navigate to this page from the Feature Flags table instead of from the sidebar.",
          );
        }

        const members = await FeatureFlag.getMembers(ctx.params.key);

        if (members.length === 0) {
          return new Layout({
            title: "View Members",
            children: [
              io.display.heading("No members found", { level: 3 }),
              io.display.link("Add Members", {
                route: "featureFlags/add-members",
                params: { key: ctx.params.key },
              }),
            ],
          });
        }

        return new Layout({
          title: `${ctx.params.key} - View Members`,
          menuItems: [
            {
              label: "Remove Members",
              route: "featureFlags/remove-members",
              params: { key: ctx.params.key },
            },
            {
              label: "Add Members",
              route: "featureFlags/add-members",
              params: { key: ctx.params.key },
            },
          ],
          children: [
            io.display.table("", {
              data: members,
              columns: [
                { label: "Entity ID", accessorKey: "entityId" },
                { label: "Entity Type", accessorKey: "entityType" },
                {
                  label: "Value",
                  renderCell: (row) => renderValue(row),
                },
                { label: "Created At", accessorKey: "createdAt" },
              ],
            }),
          ],
        });
      },
    }),
    "add-members": new Action({
      name: "Add Members",
      unlisted: true,
      handler: async () => {
        if (typeof ctx?.params?.key !== "string") {
          throw new Error(
            "Please navigate to this page from the Feature Flags table instead of from the sidebar.",
          );
        }

        const flag = await FeatureFlag.get(ctx.params.key);
        if (!flag) {
          throw new Error("Feature flag not found");
        }

        const [entityIdsInput, entityType, value] = await io.group([
          io.input.text("Entity IDs", {
            multiline: true,
            helpText:
              "Enter a comma separated list of entity IDs or 1 per line.",
          }),
          io.input.text("Entity Type", {
            helpText:
              "Enter the type of entity that these IDs represent e.g. user, organization, etc.",
          }),
          getValueInput({
            isStatic: flag.isStatic,
            valueType: flag.valueType,
          }),
        ]);

        // parse the entity ids input into an array
        const entityIds = entityIdsInput
          .split(/[\n,]/) // Split by newline or comma
          .map((id) => id.trim())
          .filter((id) => id !== "");

        const valueMap = FeatureFlag.generateValueMap(flag.valueType, value);
        await FeatureFlag.addMembers(
          ctx.params.key,
          entityIds,
          entityType,
          valueMap,
        );
        await ctx.redirect({
          route: "featureFlags/view-members",
          params: { key: ctx.params.key },
        });
      },
    }),
    "remove-members": new Action({
      name: "Remove Members",
      unlisted: true,
      handler: async () => {
        const flagKey = ctx?.params?.key;
        if (typeof flagKey !== "string") {
          throw new Error(
            "Please navigate to this page from the Feature Flags table instead of from the sidebar.",
          );
        }

        const members = await FeatureFlag.getMembers(flagKey);

        if (members.length === 0) {
          throw new Error("No members to remove");
        }

        const selectedMembers = await io.select.table(
          "Select members to remove",
          {
            data: members,
            minSelections: 1,
            maxSelections: members.length,
            columns: [
              { label: "Entity ID", accessorKey: "entityId" },
              { label: "Entity Type", accessorKey: "entityType" },
              {
                label: "Value",
                renderCell: (row) => renderValue(row),
              },
              { label: "Created At", accessorKey: "createdAt" },
            ],
          },
        );

        await FeatureFlag.removeMembers(
          selectedMembers.map((member) => ({
            flagKey: flagKey,
            entityId: member.entityId,
          })),
        );

        await ctx.redirect({
          route: "featureFlags/view-members",
          params: { key: ctx.params.key },
        });
      },
    }),
  },
  handler: async () => {
    const dynamicFlags = await FeatureFlag.list({ isStatic: false });
    const staticFlags = await FeatureFlag.list({ isStatic: true });
    return new Layout({
      title: "Feature Flags",
      menuItems: [{ label: "Create Flag", route: "featureFlags/create" }],
      children: [
        io.display.heading("🤹 Dynamic", { level: 3 }),
        io.display.table("", {
          data: dynamicFlags.items,
          columns: [
            {
              label: "Key",
              renderCell: (row) => ({
                label: row.flagKey,
                route: "featureFlags/edit",
                params: { key: row.flagKey },
              }),
            },
            {
              label: "Type",
              renderCell: (row) => {
                switch (row.valueType.toUpperCase()) {
                  case "BOOLEAN":
                    return "Boolean";
                  case "STRING":
                    return "String";
                  case "NUMBER":
                    return "Number";
                  case "STRUCTURED":
                    return "Structured";
                  default:
                    return "Unknown";
                }
              },
            },
            {
              label: "Description",
              renderCell: (row) => {
                const description = row.description || "";
                return description.length > 50
                  ? `${description.slice(0, 50)}...`
                  : description;
              },
            },
            {
              label: "Status",
              renderCell: (row) => renderStatus(row),
            },
            { label: "Created At", accessorKey: "createdAt" },
            { label: "Updated At", accessorKey: "updatedAt" },
          ],
          rowMenuItems: (row) => [
            {
              label: "Add Members",
              route: `featureFlags/add-members`,
              params: { key: row.flagKey },
            },
            {
              label: "Remove Members",
              route: `featureFlags/remove-members`,
              params: { key: row.flagKey },
            },
            {
              label: "View Members",
              route: `featureFlags/view-members`,
              params: { key: row.flagKey },
            },
            {
              label: "Edit Details",
              route: `featureFlags/edit`,
              params: { key: row.flagKey },
            },
            {
              label: "Archive",
              route: `featureFlags/archive`,
              params: { key: row.flagKey },
              theme: "danger",
            },
          ],
        }),
        io.display.heading("🗿 Static", { level: 3 }),
        io.display.table("", {
          data: staticFlags.items,
          columns: [
            {
              label: "Key",
              renderCell: (row) => ({
                label: row.flagKey,
                route: "featureFlags/edit",
                params: { key: row.flagKey },
              }),
            },
            {
              label: "Type",
              renderCell: (row) => {
                switch (row.valueType.toUpperCase()) {
                  case "BOOLEAN":
                    return "Boolean";
                  case "STRING":
                    return "String";
                  case "NUMBER":
                    return "Number";
                  case "STRUCTURED":
                    return "Structured";
                  default:
                    return "Unknown";
                }
              },
            },
            {
              label: "Description",
              renderCell: (row) => {
                const description = row.description || "";
                return description.length > 50
                  ? `${description.slice(0, 50)}...`
                  : description;
              },
            },
            {
              label: "Value",
              renderCell: (row) => renderValue(row),
            },
            {
              label: "Status",
              renderCell: (row) => renderStatus(row),
            },
            { label: "Created At", accessorKey: "createdAt" },
            { label: "Updated At", accessorKey: "updatedAt" },
          ],
          rowMenuItems: (row) => [
            {
              label: "Edit Details",
              route: `featureFlags/edit`,
              params: { key: row.flagKey },
            },
            {
              label: "Archive",
              route: `featureFlags/archive`,
              params: { key: row.flagKey },
              theme: "danger",
            },
          ],
        }),
      ],
    });
  },
});
