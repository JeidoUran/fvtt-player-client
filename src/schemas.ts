import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = 2;

export const optionalUrl = z.preprocess((val) => {
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
}, z.url().optional());

// Primitive type aliases
export const GameIdSchema = z.union([z.string(), z.number()]);
export type GameId = z.infer<typeof GameIdSchema>;

// GameConfig
export const GameConfigSchema = z.object({
  name: z.string().optional(),
  url: z.string().optional(),
  id: GameIdSchema.optional(),
  cssId: z.string().optional(),
});
export type GameConfig = z.infer<typeof GameConfigSchema>;

// ServerInfoOptions
export const ServerInfoOptionsSchema = z
  .object({
    statusEnabled: z.boolean().optional(),
    foundryVersionEnabled: z.boolean().optional(),
    worldEnabled: z.boolean().optional(),
    gameSystemEnabled: z.boolean().optional(),
    gameSystemVersionEnabled: z.boolean().optional(),
    onlinePlayersEnabled: z.boolean().optional(),
  })
  .prefault({
    statusEnabled: true,
    foundryVersionEnabled: true,
    worldEnabled: false,
    gameSystemEnabled: true,
    gameSystemVersionEnabled: true,
    onlinePlayersEnabled: true,
  });
export type ServerInfoOptions = z.infer<typeof ServerInfoOptionsSchema>;

// AppConfig
export const AppConfigSchema = z.object({
  games: z.array(GameConfigSchema),
  cachePath: z.string().optional(),
  autoCacheClear: z.boolean().optional(),
  customCSS: z.string().optional(),
  ignoreCertificateErrors: z.boolean().optional(),
  discordRP: z.boolean().optional(),
  notificationTimer: z.number().optional(),
  serverInfoEnabled: z.boolean().optional(),
  serverInfoOptions: ServerInfoOptionsSchema,
  serverInfoPingRate: z.number().optional().prefault(30),
  fullScreenEnabled: z.boolean().optional().prefault(false),
  shareSessionWindows: z.boolean().optional().prefault(false),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

// ParticleOptions
export const ParticleOptionsSchema = z
  .object({
    count: z.number().optional(),
    speedYMin: z.number().optional(),
    speedYMax: z.number().optional(),
    color: z.string().optional(),
    alpha: z.number().optional(),
  })
  .prefault({
    count: 100,
    speedYMin: 0.1,
    speedYMax: 0.3,
    color: "#63b0c4",
    alpha: 0.15,
  });
export type ParticleOptions = z.infer<typeof ParticleOptionsSchema>;

// ThemeConfig
// schemas.ts

export const ThemeConfigSchema = z.object({
  background: z.string().prefault(""),
  backgrounds: z.array(z.string()).prefault([]),
  backgroundColor: z.string().prefault("#0e1a23"),
  textColor: z.string().prefault("#88c0a9"),
  accentColor: z.string().prefault("#98e4f7"),
  buttonColorAlpha: z.number().prefault(0.65),
  buttonColor: z.string().prefault("#14141e"),
  buttonColorHoverAlpha: z.number().prefault(0.95),
  buttonColorHover: z.string().prefault("#28283c"),
  particlesEnabled: z.boolean().prefault(true),
  particleOptions: ParticleOptionsSchema,
  baseTheme: z.string().prefault("codex"),
  fontPrimary: z.string().prefault(""),
  fontPrimaryUrl: optionalUrl.prefault(""),
  fontPrimaryName: z.string().optional(),
  fontPrimaryFilePath: z.string().optional(),
  fontSecondary: z.string().prefault(""),
  fontSecondaryUrl: optionalUrl.prefault(""),
  fontSecondaryName: z.string().optional(),
  fontSecondaryFilePath: z.string().optional(),
});
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

// cachePath, app, theme, schemaVersion and lastRunAppVersion
const UserDataStaticSchema = z.object({
  cachePath: z.string().optional(),
  app: AppConfigSchema.optional(),
  theme: ThemeConfigSchema.optional(),
  schemaVersion: z.number().prefault(CURRENT_SCHEMA_VERSION),
  lastRunAppVersion: z.string().prefault("0.0.0"),
});

// GameUserData
export const GameUserDataSchema = z.object({
  password: z.array(z.number()).optional(),
  user: z.string(),
  adminPassword: z.array(z.number()).optional(),
});

// Full schema + "catchall" to account for dynamic keys
export const UserDataSchema = UserDataStaticSchema.catchall(GameUserDataSchema);
export type UserData = z.infer<typeof UserDataSchema>;

// SaveUserData
export const SaveUserDataSchema = z.object({
  gameId: GameIdSchema,
  password: z.string(),
  user: z.string(),
  adminPassword: z.string(),
});
export type SaveUserData = z.infer<typeof SaveUserDataSchema>;

// WindowData
export const WindowDataSchema = z.object({
  gameId: GameIdSchema,
  autoLogin: z.boolean(),
  selectedServerName: z.string().optional(),
});
export type WindowData = z.infer<typeof WindowDataSchema>;

// WindowsData: record of windowId:string->WindowData
export const WindowsDataSchema = z.record(z.string(), WindowDataSchema);
export type WindowsData = z.infer<typeof WindowsDataSchema>;

// ServerStatusData
export const ServerStatusDataSchema = z.object({
  active: z.boolean(),
  version: z.string(),
  world: z.string(),
  system: z.string(),
  systemVersion: z.string(),
  users: z.number(),
  uptime: z.number(),
});
export type ServerStatusData = z.infer<typeof ServerStatusDataSchema>;
