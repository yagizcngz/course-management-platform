// Settings sections; admins have no wallet (purchases), only admins see system and categories.
export const SETTINGS_TABS = [
  "account",
  "security",
  "preferences",
  "privacy",
  "purchases",
  "system",
  "categories",
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

const ADMIN_ONLY: SettingsTab[] = ["system", "categories"];

export const tabsFor = (isAdmin: boolean) =>
  SETTINGS_TABS.filter((tab) =>
    tab === "purchases" ? !isAdmin : !ADMIN_ONLY.includes(tab) || isAdmin,
  );

/** ?tab= the role does not have (a student's ?tab=system) opens the account section instead of an empty page. */
export const tabOrDefault = (tab: SettingsTab | undefined, isAdmin: boolean): SettingsTab =>
  tab && tabsFor(isAdmin).includes(tab) ? tab : "account";
