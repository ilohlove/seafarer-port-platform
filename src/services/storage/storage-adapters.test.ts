import { describe, expect, test } from "vitest";

import { createServices } from "../create-services";
import { MilestoneUnavailableError } from "../service-errors";
import { MemoryStorage } from "./storage-utils";

describe("browser storage adapters", () => {
  test("persists locale and an explicit bandwidth preference", async () => {
    const services = createServices({
      storage: new MemoryStorage(),
      mockLatencyMs: 0,
    });

    await services.preferences.update({
      locale: "en",
      bandwidthMode: "ultraLite",
      bandwidthModeWasUserSelected: true,
    });

    await expect(services.preferences.get()).resolves.toEqual({
      locale: "en",
      bandwidthMode: "ultraLite",
      bandwidthModeWasUserSelected: true,
    });
  });

  test("keeps later-milestone behavior explicitly unavailable", async () => {
    const services = createServices({
      storage: new MemoryStorage(),
      mockLatencyMs: 0,
    });
    const hub = await services.ports.getPortHub({ portSlug: "singapore" });
    expect(hub).toBeDefined();
    if (!hub) {
      return;
    }

    await expect(services.offlinePacks.list()).resolves.toEqual([]);
    await expect(services.offlinePacks.save(hub)).rejects.toBeInstanceOf(
      MilestoneUnavailableError,
    );
    await expect(
      services.planner.createPlan({
        portId: hub.port.id,
        terminalId: hub.terminals[0]?.id ?? "terminal",
        shoreLeaveStartsAt: "2026-08-10T08:00:00Z",
        mustReturnBy: "2026-08-10T12:00:00Z",
        currency: "SGD",
        partySize: 1,
        maximumWalkingMinutes: 15,
        needs: [],
      }),
    ).rejects.toBeInstanceOf(MilestoneUnavailableError);
  });
});
