import type { StaffTitleDefinition, SupporterDefinition, UserRankIconKey } from "../../types";

type IconName = UserRankIconKey | StaffTitleDefinition["icon"] | SupporterDefinition["icon"];

export function IdentityIcon({ name, className }: { readonly name: IconName; readonly className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false" data-identity-icon={name}>
      <g {...common}>{iconPaths[name]}</g>
    </svg>
  );
}

const iconPaths: Readonly<Record<IconName, React.ReactNode>> = {
  anchor: <><circle cx="16" cy="7" r="3"/><path d="M16 10v15M10 14h12M6 20c2 6 7 8 10 8s8-2 10-8M6 20l4 1M26 20l-4 1"/></>,
  knot: <><path d="M8 9c5-4 11 1 7 5l-6 6c-4 4-9-2-5-6l5-5M24 23c-5 4-11-1-7-5l6-6c4-4 9 2 5 6l-5 5"/><path d="m10 22 12-12"/></>,
  wave: <><path d="M3 20c4 0 4-4 8-4s4 4 8 4 4-4 10-4M4 25c3 0 4-3 7-3 4 0 4 3 8 3 3 0 4-3 8-3"/><path d="M8 15c3-9 12-10 17-4-6-1-8 3-7 7"/></>,
  scraper: <><path d="m8 25 10-10 5 5-10 10zM18 15l3-7 5 5-3 7M20 8l2-3 5 5-1 3"/></>,
  nightWatch: <><path d="M18 4a10 10 0 1 0 9 14A11 11 0 0 1 18 4"/><circle cx="11" cy="23" r="4"/><circle cx="21" cy="23" r="4"/><path d="M15 23h2M7 21l2-7M25 21l-2-7"/></>,
  radar: <><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="7"/><circle cx="16" cy="16" r="2"/><path d="M16 4v24M4 16h24M16 16l8-8"/></>,
  horizon: <><path d="M4 21h24M6 25h20M8 21a8 8 0 0 1 16 0M8 11c5-4 11-4 16 0"/></>,
  shipBow: <><path d="m16 4 8 18-8 6-8-6zM16 4v24M10 14h12M4 27c4-3 8 2 12 0s8-3 12 0"/></>,
  lighthouse: <><path d="M11 28h10l-2-17h-6zM12 11h8l-1-5h-6zM10 6h12M5 10l6 2M27 10l-6 2M4 5l7 3M28 5l-7 3"/></>,
  oceanLegend: <><path d="M16 4v20M10 7l6-4 6 4M10 7v7M22 7v7M7 14c3 4 6 5 9 5s6-1 9-5"/><circle cx="16" cy="20" r="8"/><path d="M16 12v16M8 20h16M10 26l12-12"/></>,
  helm: <><circle cx="16" cy="16" r="8"/><circle cx="16" cy="16" r="2"/><path d="M16 2v6M16 24v6M2 16h6M24 16h6M6 6l4 4M22 22l4 4M26 6l-4 4M10 22l-4 4"/></>,
  command: <><circle cx="16" cy="16" r="10"/><path d="m16 3 3 10 10 3-10 3-3 10-3-10-10-3 10-3z"/></>,
  harbor: <><path d="M11 28h10l-2-15h-6zM10 13h12M12 9h8l-4-5zM5 28c3-3 5 1 8 0s5-3 8 0 5-1 7 0"/></>,
  operations: <><circle cx="16" cy="16" r="5"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l4 4M21 21l4 4M25 7l-4 4M11 21l-4 4"/><circle cx="16" cy="16" r="11"/></>,
  heartAnchor: <><path d="M16 11c-4-6-11 0 0 8 11-8 4-14 0-8M16 19v10M11 23h10M8 25c2 4 6 4 8 4s6 0 8-4"/></>,
  heartCompass: <><path d="M16 10c-4-6-11 0 0 8 11-8 4-14 0-8"/><circle cx="16" cy="22" r="7"/><path d="m16 17 2 5-2 5-2-5z"/></>,
  heartBeacon: <><path d="M16 9c-4-6-11 0 0 8 11-8 4-14 0-8M12 29h8l-2-11h-4zM6 20l6 2M26 20l-6 2"/></>,
};
