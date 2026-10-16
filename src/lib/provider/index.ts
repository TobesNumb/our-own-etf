import { config } from "../config";
import type { DataProvider } from "./types";

let cached: DataProvider | null = null;

/** De actieve databron, gekozen via DATA_SOURCE. */
export async function getProvider(): Promise<DataProvider> {
  if (cached) return cached;
  if (config.dataSource === "mock") {
    const { mockProvider } = await import("./mock");
    cached = mockProvider;
  } else {
    const { yahooProvider } = await import("./yahoo");
    cached = yahooProvider;
  }
  return cached;
}

export type * from "./types";
