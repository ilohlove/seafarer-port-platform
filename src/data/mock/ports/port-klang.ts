import type { PortHubReadModel } from "../../../types";
import { mockConnectivityProducts } from "../connectivity-products";
import {
  communityConfirmedTrust,
  communitySource,
  conflictingTrust,
  createKnowledgeMeta,
  needsConfirmationTrust,
  officialSource,
  officialTrust,
  unknownTrust,
} from "../fixture-builders";
import { portKlangSearchEntry } from "../port-search-index";
import { block, money, note, place, review, terminalAccess } from "../scenario-builders";

const [asiaSailProduct, asiaPlusProduct, , , malaysiaLocalProduct] =
  mockConnectivityProducts;
const portKlangId = portKlangSearchEntry.port.id;
const westportsTerminalId = "terminal-klang-westports";
const northportTerminalId = "terminal-klang-northport";

export const portKlangScenario = {
  port: portKlangSearchEntry.port,
  terminals: portKlangSearchEntry.terminals,
  selectedTerminalId: westportsTerminalId,
  criticalInformation: [
    {
      id: "klang-shuttle-conflict",
      severity: "critical",
      title: "Báo cáo shuttle mâu thuẫn",
      summary:
        "Một số báo cáo nói có shuttle theo giờ; báo cáo khác nói phải đặt qua agent.",
      meta: createKnowledgeMeta(portKlangId, conflictingTrust, {
        source: communitySource,
        moderationStatus: "needsReview",
      }),
    },
  ],
  quickBrief: [
    {
      id: "klang-brief-access",
      label: "Lên bờ",
      value: "Xác nhận trực tiếp với agent",
      emphasis: "caution",
      meta: createKnowledgeMeta(portKlangId, conflictingTrust, {
        source: communitySource,
      }),
    },
    {
      id: "klang-brief-return",
      label: "Quay lại tàu",
      value: "Không dựa vào lịch shuttle mẫu",
      emphasis: "caution",
      meta: createKnowledgeMeta(portKlangId, conflictingTrust),
    },
  ],
  overview: {
    decisionSummary:
      "Có dữ liệu mâu thuẫn về shuttle và gate: phải xác nhận với agent trước khi rời tàu.",
    items: [
      block(
        portKlangId,
        "klang-currency",
        "Tiền tệ",
        "Malaysian ringgit (MYR); tình trạng chấp nhận thẻ thay đổi theo điểm.",
        ["Kiểm tra phí và DCC tại ATM."],
        communityConfirmedTrust,
        communitySource,
      ),
    ],
  },
  access: {
    shoreLeave: block(
      portKlangId,
      "klang-shore-leave",
      "Shore leave",
      "Báo cáo cộng đồng chưa thống nhất theo terminal.",
      ["Xác nhận với agent cho chuyến tàu hiện tại."],
      conflictingTrust,
      communitySource,
    ),
    requiredDocuments: block(
      portKlangId,
      "klang-documents",
      "Giấy tờ",
      "Có báo cáo yêu cầu shore pass nhưng phạm vi chưa rõ.",
      [],
      needsConfirmationTrust,
      communitySource,
    ),
    terminalAccess: block(
      portKlangId,
      "klang-terminal",
      "Terminal và gate",
      "Westports và Northport có quy trình khác nhau.",
      ["Chọn terminal trước khi dùng hướng dẫn."],
      officialTrust,
      officialSource,
    ),
    transport: [
      block(
        portKlangId,
        "klang-shuttle",
        "Shuttle",
        "Lịch và cách đặt shuttle đang có báo cáo mâu thuẫn.",
        ["Không lập kế hoạch dựa riêng vào lịch mẫu."],
        conflictingTrust,
        communitySource,
      ),
      block(
        portKlangId,
        "klang-taxi",
        "Taxi và ride-hailing",
        "Điểm đón phụ thuộc gate; cần xác nhận.",
        [],
        needsConfirmationTrust,
        communitySource,
      ),
    ],
    returnToShip: block(
      portKlangId,
      "klang-return",
      "Quay lại tàu",
      "Dùng buffer lớn và xác nhận phương tiện quay lại trước khi đi.",
      ["Lưu terminal, gate và số liên hệ agent."],
      conflictingTrust,
      communitySource,
    ),
  },
  internet: {
    bestOption: block(
      portKlangId,
      "klang-connectivity",
      "Lựa chọn phù hợp",
      "eSIM khu vực có hotspot phù hợp hơn SIM mẫu không hỗ trợ hotspot.",
      ["So sánh theo nhu cầu hotspot và hành trình."],
      communityConfirmedTrust,
      communitySource,
    ),
    mobileOperators: [],
    esimProducts: [malaysiaLocalProduct, asiaSailProduct, asiaPlusProduct],
    physicalSim: [],
    wifi: [
      block(
        portKlangId,
        "klang-wifi",
        "Wi-Fi",
        "Chưa có dữ liệu Wi-Fi đáng tin cho terminal.",
        [],
        unknownTrust,
      ),
    ],
  },
  services: {
    categories: [
      {
        id: "klang-atm",
        label: "ATM và đổi tiền",
        recommendations: [
          {
            place: place(
              portKlangId,
              "place-klang-atm",
              "Terminal ATM (sample)",
              "atm",
              "Gate location differs by terminal",
              conflictingTrust,
              ["dcc-status-conflicting"],
            ),
            access: terminalAccess(
              "access-klang-atm-westports",
              westportsTerminalId,
              "place-klang-atm",
              "walk",
              conflictingTrust,
              {
                gateName: "Main Gate",
                walkingDistanceM: 700,
                walkingDurationMin: 10,
                routeWarning: "Northport reports place this ATM at a different gate.",
                minimumRecommendedShoreLeaveMin: 45,
              },
            ),
            statusTags: ["terminal-specific", "conflicting-terminal-reports"],
            reasonCodes: ["reported-near-gate", "conflicting-fee-reports"],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "klang-shopping",
        label: "Mua sắm",
        recommendations: [
          {
            place: place(
              portKlangId,
              "place-klang-shop",
              "Crew Supply Stop (sample)",
              "shopping",
              "Outside terminal",
              needsConfirmationTrust,
              ["essentials-basket"],
            ),
            access: terminalAccess(
              "access-klang-shop-westports",
              westportsTerminalId,
              "place-klang-shop",
              "taxi",
              needsConfirmationTrust,
              {
                gateName: "Main Gate",
                drivingDurationMin: 22,
                taxiFareMin: money(25, "MYR"),
                taxiFareMax: money(35, "MYR"),
                minimumRecommendedShoreLeaveMin: 150,
              },
            ),
            statusTags: ["needs-terminal-confirmation"],
            reasonCodes: ["essential-basket-reported", "needs-confirmation"],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "klang-food",
        label: "Ăn uống",
        recommendations: [],
        totalAvailable: 0,
      },
      {
        id: "klang-medical",
        label: "Y tế và nhà thuốc",
        recommendations: [],
        totalAvailable: 0,
      },
      {
        id: "klang-welfare",
        label: "Welfare",
        recommendations: [],
        totalAvailable: 0,
      },
    ],
  },
  emergencyContacts: [
    {
      id: "klang-emergency-999",
      contactType: "ambulance",
      scope: { kind: "country", referenceId: "MY", label: "Malaysia" },
      displayName: "Emergency services",
      phoneShortCode: "999",
      phoneLocalFormat: "999",
      available24h: true,
      languageSupport: ["ms", "en"],
      callingInstruction: "Use official emergency number; also notify Master or agent.",
      trust: officialTrust,
    },
  ],
  welfareProviders: [
    {
      id: "welfare-klang-mobile",
      name: "Mobile Welfare Contact (sample)",
      providerType: "portWelfareCommittee",
      portIds: [portKlangId],
      terminalIds: [westportsTerminalId, northportTerminalId],
      placeIds: [],
      contactChannelIds: ["contact-klang-welfare-whatsapp"],
      trust: needsConfirmationTrust,
    },
  ],
  welfareServices: [
    {
      id: "welfare-klang-ship-visit",
      providerId: "welfare-klang-mobile",
      capability: "shipVisit",
      status: "reportedAvailable",
      terminalIds: [westportsTerminalId, northportTerminalId],
      scheduleSummary: "Reported by community; contact before relying on ship visit.",
      contactMethod: "WhatsApp",
      costType: "unknown",
      trust: needsConfirmationTrust,
    },
    {
      id: "welfare-klang-remote-support",
      providerId: "welfare-klang-mobile",
      capability: "remoteSupport",
      status: "reportedAvailable",
      terminalIds: [westportsTerminalId, northportTerminalId],
      scheduleSummary: "Remote contact only; no physical centre in this prototype scenario.",
      contactMethod: "WhatsApp",
      costType: "unknown",
      trust: needsConfirmationTrust,
    },
  ],
  community: {
    notes: [
      note(
        "note-klang-esim",
        portKlangId,
        "esim",
        "eSIM khu vực thuận tiện hơn nếu cần hotspot",
        "Gói khu vực có hotspot trong dữ liệu mẫu; kiểm tra vùng phủ theo terminal trước khi dùng.",
        {
          topic: "esim",
          planName: "Asia Sail 5 GB",
          hotspotWorked: true,
          signalQuality: "usable",
          videoCallQuality: "usable",
        },
        communityConfirmedTrust,
        { terminalId: westportsTerminalId, confirmationCount: 5, usefulnessCount: 8 },
      ),
      note(
        "note-klang-shuttle-1",
        portKlangId,
        "taxi",
        "Báo cáo A: có shuttle theo giờ",
        "Một thuyền viên ghi nhận shuttle theo giờ tại Westports; cần xác nhận chuyến cuối.",
        {
          topic: "taxi",
          fromGate: "Main Gate",
          transportType: "taxi",
          priceAgreedBeforeRide: true,
        },
        conflictingTrust,
        { terminalId: westportsTerminalId, gateName: "Main Gate", confirmationCount: 3 },
      ),
      note(
        "note-klang-shuttle-2",
        portKlangId,
        "taxi",
        "Báo cáo B: agent đặt xe riêng",
        "Báo cáo khác không thấy shuttle và dùng xe do agent sắp xếp; không coi shuttle là chắc chắn.",
        {
          topic: "taxi",
          fromGate: "Main Gate",
          transportType: "taxi",
          priceAgreedBeforeRide: false,
        },
        conflictingTrust,
        { terminalId: westportsTerminalId, gateName: "Main Gate", confirmationCount: 3 },
      ),
      note(
        "note-klang-places",
        portKlangId,
        "placesToVisit",
        "Chưa có điểm tham quan đủ tin cậy cho chuyến ngắn",
        "Ưu tiên chốt phương tiện và buffer quay lại trước khi chọn nơi đi.",
        {
          topic: "placesToVisit",
          category: "short shore leave",
          estimatedTimeNeeded: 150,
        },
        needsConfirmationTrust,
        { terminalId: westportsTerminalId, confirmationCount: 1 },
      ),
    ],
    reviews: [
      review(
        "review-klang-1",
        portKlangId,
        "Thủy thủ A",
        "Có shuttle theo giờ trong lần ghé gần đây.",
        ["shuttle", "westports"],
        conflictingTrust,
      ),
      review(
        "review-klang-2",
        portKlangId,
        "Thủy thủ B",
        "Không thấy shuttle; agent đã đặt xe riêng.",
        ["shuttle", "agent-transport"],
        conflictingTrust,
      ),
    ],
    openConfirmationCount: 12,
    contributionPrompt: "Xác nhận terminal và cách dùng shuttle trong chuyến gần nhất.",
  },
  dataHealth: {
    coverage: "limited",
    missingAreas: ["food", "medical", "wifi"],
    conflictingAreas: ["shore-leave", "shuttle", "atm-fee", "terminal-specific-access"],
    trust: conflictingTrust,
  },
} as const satisfies PortHubReadModel;
