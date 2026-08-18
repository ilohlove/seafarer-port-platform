import type { ConnectivityProduct } from "../../types";
import {
  communityConfirmedTrust,
  communitySource,
  officialTrust,
  seedSource,
} from "./fixture-builders";

export const mockConnectivityProducts = [
  {
    id: "esim-asia-sail-5",
    name: "Asia Sail 5 GB",
    provider: "Demo Connect",
    dataAllowanceGb: 5,
    validityDays: 15,
    hotspotAllowed: true,
    activation: "beforeArrival",
    price: {
      amount: 18.5,
      currency: "USD",
      observedAt: "2026-07-01T00:00:00Z",
      source: seedSource,
    },
    coverage: [
      {
        countryCode: "SG",
        portIds: ["port-singapore"],
        quality: "good",
      },
      {
        countryCode: "KR",
        portIds: ["port-busan"],
        quality: "good",
      },
      {
        countryCode: "MY",
        portIds: ["port-klang"],
        quality: "usable",
      },
    ],
    trust: communityConfirmedTrust,
  },
  {
    id: "esim-maritime-asia-plus",
    name: "Maritime Asia Plus 20 GB",
    provider: "Ocean Signal Demo",
    dataAllowanceGb: 20,
    validityDays: 30,
    hotspotAllowed: true,
    activation: "either",
    price: {
      amount: 28,
      currency: "USD",
      observedAt: "2026-07-01T00:00:00Z",
      source: communitySource,
    },
    coverage: [
      {
        countryCode: "SG",
        portIds: ["port-singapore"],
        quality: "excellent",
      },
      {
        countryCode: "KR",
        portIds: ["port-busan"],
        quality: "excellent",
      },
      {
        countryCode: "MY",
        portIds: ["port-klang"],
        quality: "good",
      },
    ],
    trust: communityConfirmedTrust,
  },
  {
    id: "esim-singapore-local",
    name: "Singapore Local 10 GB",
    provider: "Lion City Mobile Demo",
    dataAllowanceGb: 10,
    validityDays: 10,
    hotspotAllowed: true,
    activation: "onArrival",
    price: {
      amount: 8,
      currency: "USD",
      observedAt: "2026-07-01T00:00:00Z",
      source: seedSource,
    },
    coverage: [
      {
        countryCode: "SG",
        portIds: ["port-singapore"],
        quality: "excellent",
      },
    ],
    trust: officialTrust,
  },
  {
    id: "esim-korea-local",
    name: "Korea Local 10 GB",
    provider: "Korea Mobile Demo",
    dataAllowanceGb: 10,
    validityDays: 10,
    hotspotAllowed: true,
    activation: "beforeArrival",
    price: {
      amount: 9,
      currency: "USD",
      observedAt: "2026-07-01T00:00:00Z",
      source: seedSource,
    },
    coverage: [
      {
        countryCode: "KR",
        portIds: ["port-busan"],
        quality: "excellent",
      },
    ],
    trust: officialTrust,
  },
  {
    id: "esim-malaysia-local",
    name: "Malaysia Local 10 GB",
    provider: "Malaysia Mobile Demo",
    dataAllowanceGb: 10,
    validityDays: 10,
    hotspotAllowed: false,
    activation: "onArrival",
    price: {
      amount: 7,
      currency: "USD",
      observedAt: "2026-07-01T00:00:00Z",
      source: seedSource,
    },
    coverage: [
      {
        countryCode: "MY",
        portIds: ["port-klang"],
        quality: "excellent",
      },
    ],
    trust: officialTrust,
  },
] as const satisfies readonly ConnectivityProduct[];
