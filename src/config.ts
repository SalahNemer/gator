import fs from "fs";
import os from "os";
import path from "path";

type Config = {
  dbUrl: string;
  currentUserName: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function validateConfig(rawConfig: any): Config {
  if (!rawConfig.db_url || typeof rawConfig.db_url !== "string") {
    throw new Error("db_url is missing or invalid in config file");
  }
  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("current_user_name must be a string if present");
  }

  const config: Config = {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name ?? "",
  };

  return config;
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };

  const fullPath = getConfigFilePath();
  const data = JSON.stringify(rawConfig, null, 2);
  fs.writeFileSync(fullPath, data, { encoding: "utf-8" });
}

export function readConfig(): Config {
  const fullPath = getConfigFilePath();
  const data = fs.readFileSync(fullPath, { encoding: "utf-8" });
  const rawConfig = JSON.parse(data);
  return validateConfig(rawConfig);
}

export function setUser(userName: string): void {
  const config = readConfig();
  config.currentUserName = userName;
  writeConfig(config);
}
