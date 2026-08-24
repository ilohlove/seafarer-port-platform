import type { PortHeroMediaReadModel } from "../../types";
import type {
  PortHeroMediaRequest,
  PortMediaRepository,
  RequestOptions,
} from "../contracts";
import { withAbort } from "../request-utils";

const busanNewPortHero: PortHeroMediaReadModel = {
  id: "hero-krpus-new-port-pantos",
  portUnLocode: "KRPUS",
  contextSlug: "new-port",
  contextLabel: "Busan New Port",
  objectPosition: "50% 43%",
  variants: [
    {
      src: "/media/ports/krpus/busan-new-port-960.jpg",
      width: 960,
      height: 614,
      byteSize: 161_583,
      sha256:
        "0f6d0ef7f1b75a5977c355c6dd2a5f2cb3db449abb52c577e5fddeb366377e41",
      mediaType: "image/jpeg",
    },
    {
      src: "/media/ports/krpus/busan-new-port-1280.jpg",
      width: 1280,
      height: 819,
      byteSize: 267_494,
      sha256:
        "5ac9ce2621256705247cd2c5d54767c58e6ee1d1a6d4b560c25ad6162004b653",
      mediaType: "image/jpeg",
    },
  ],
  attribution: {
    creator: "Romlogistics",
    provider: "Wikimedia Commons",
    sourcePageUrl:
      "https://commons.wikimedia.org/wiki/File:Pantos_Logistics_-_Busan_New_Port_Warehouse.jpg",
    licenseName: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    capturedAt: "2010-11-24",
    changes: "Wikimedia Commons resized variants; CSS crop and overlay in UI.",
  },
};

export class MockPortMediaRepository implements PortMediaRepository {
  getHero(
    request: PortHeroMediaRequest,
    options: RequestOptions = {},
  ): Promise<PortHeroMediaReadModel | undefined> {
    const matchesBusan =
      request.portId === "port-busan" ||
      request.portUnLocode?.toUpperCase() === "KRPUS" ||
      request.portSlug === "busan";
    const result =
      matchesBusan && request.contextSlug === "new-port"
        ? busanNewPortHero
        : undefined;
    return withAbort(Promise.resolve(result), options.signal);
  }
}
