import type { PortHubReadModel } from "../../types";
import { busanScenario } from "./ports/busan";
import { portKlangScenario } from "./ports/port-klang";
import { singaporeScenario } from "./ports/singapore";

export { busanScenario, portKlangScenario, singaporeScenario };

export const mockPortScenarios = [
  singaporeScenario,
  busanScenario,
  portKlangScenario,
] as const satisfies readonly PortHubReadModel[];
