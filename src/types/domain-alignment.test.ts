import { describe, expect, it } from "vitest";

import { busanScenario } from "../data/mock/ports/busan";
import { portKlangScenario } from "../data/mock/ports/port-klang";
import { singaporeScenario } from "../data/mock/ports/singapore";
import type { PlaceRecommendation, PortHubReadModel } from "./read-models";

const scenarios: readonly PortHubReadModel[] = [
  singaporeScenario,
  busanScenario,
  portKlangScenario,
];

function serviceRecommendations(
  hub: PortHubReadModel,
): readonly PlaceRecommendation[] {
  return hub.services.categories.flatMap((category) => category.recommendations);
}

describe("F1.5 domain alignment", () => {
  it("keeps service recommendations terminal-scoped or explicitly marked", () => {
    for (const hub of scenarios) {
      for (const recommendation of serviceRecommendations(hub)) {
        expect(
          Boolean(recommendation.access) || Boolean(recommendation.scopeWarning),
        ).toBe(true);
      }
    }
  });

  it("does not model emergency contacts as places", () => {
    for (const hub of scenarios) {
      expect(hub.emergencyContacts.length).toBeGreaterThan(0);
      expect(
        serviceRecommendations(hub).some(
          (recommendation) => recommendation.place.category === "medical",
        ),
      ).toBe(false);
    }
  });

  it("supports a welfare provider without a physical place", () => {
    const remoteProvider = portKlangScenario.welfareProviders.find(
      (provider) => provider.id === "welfare-klang-mobile",
    );

    expect(remoteProvider).toBeDefined();
    expect(remoteProvider?.placeIds).toHaveLength(0);
    expect(
      portKlangScenario.welfareServices.some(
        (service) => service.providerId === remoteProvider?.id,
      ),
    ).toBe(true);
  });

  it("keeps domain-specific trust facets separate from display trust", () => {
    const singaporeAtm = singaporeScenario.services.categories
      .find((category) => category.id === "sg-atm")
      ?.recommendations.at(0);

    const portKlangAtm = portKlangScenario.services.categories
      .find((category) => category.id === "klang-atm")
      ?.recommendations.at(0);

    expect(singaporeAtm?.statusTags).toContain("foreign-card-confirmed");
    expect(portKlangAtm?.statusTags).toContain("conflicting-terminal-reports");
  });
});
