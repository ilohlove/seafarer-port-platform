import type { PortHubReadModel } from "../../../types";
import { mockConnectivityProducts } from "../connectivity-products";
import {
  communityConfirmedTrust,
  communitySource,
  createKnowledgeMeta,
  needsConfirmationTrust,
  unknownTrust,
} from "../fixture-builders";
import { busanPortSearchEntry } from "../port-search-index";
import { block, money, place, review } from "../scenario-builders";

const [asiaSailProduct, asiaPlusProduct, , koreaLocalProduct] =
  mockConnectivityProducts;
const busanPortId = busanPortSearchEntry.port.id;

export const busanScenario = {
  port: busanPortSearchEntry.port,
  terminals: busanPortSearchEntry.terminals,
  criticalInformation: [
    {
      id: "busan-needs-check",
      severity: "warning",
      title: "Cần xác nhận trước khi lên bờ",
      summary: "Giờ shuttle và quy trình gate trong dữ liệu mẫu chưa đủ xác nhận.",
      meta: createKnowledgeMeta(busanPortId, needsConfirmationTrust, {
        source: communitySource,
        moderationStatus: "needsReview",
      }),
    },
  ],
  quickBrief: [
    {
      id: "busan-brief-access",
      label: "Lên bờ",
      value: "Hỏi agent hoặc tàu trước khi đi",
      emphasis: "caution",
      meta: createKnowledgeMeta(busanPortId, needsConfirmationTrust, {
        source: communitySource,
      }),
    },
    {
      id: "busan-brief-return",
      label: "Buffer quay lại",
      value: "Gợi ý mẫu 75 phút",
      emphasis: "caution",
      meta: createKnowledgeMeta(busanPortId, needsConfirmationTrust),
    },
  ],
  overview: {
    decisionSummary:
      "Dữ liệu mẫu còn thiếu: xác nhận terminal, shuttle và giấy tờ với agent trước khi lập kế hoạch.",
    items: [
      block(
        busanPortId,
        "busan-language",
        "Ngôn ngữ",
        "Nên lưu địa chỉ bằng tiếng Hàn để đưa cho tài xế.",
        [],
        communityConfirmedTrust,
        communitySource,
      ),
    ],
  },
  access: {
    shoreLeave: block(
      busanPortId,
      "busan-shore-leave",
      "Shore leave",
      "Trạng thái phụ thuộc chuyến tàu và terminal; cần xác nhận.",
      ["Không coi dữ liệu mẫu là giấy phép lên bờ."],
      needsConfirmationTrust,
      communitySource,
    ),
    requiredDocuments: block(
      busanPortId,
      "busan-documents",
      "Giấy tờ",
      "Chưa đủ dữ liệu xác nhận cho terminal đang chọn.",
      ["Hỏi agent về shore pass và giấy tờ phải mang theo."],
      unknownTrust,
    ),
    terminalAccess: block(
      busanPortId,
      "busan-terminal",
      "Terminal và gate",
      "Cần chọn đúng terminal trước khi xem hướng dẫn gate.",
      [],
      needsConfirmationTrust,
      communitySource,
    ),
    transport: [
      block(
        busanPortId,
        "busan-shuttle",
        "Shuttle",
        "Có báo cáo cộng đồng về shuttle nhưng chưa rõ lịch.",
        ["Xác nhận giờ chuyến cuối."],
        needsConfirmationTrust,
        communitySource,
      ),
    ],
    returnToShip: block(
      busanPortId,
      "busan-return",
      "Quay lại tàu",
      "Dữ liệu mẫu dùng buffer 75 phút vì lịch shuttle chưa rõ.",
      ["Ưu tiên chỉ dẫn trực tiếp của tàu và agent."],
      needsConfirmationTrust,
      communitySource,
    ),
  },
  internet: {
    bestOption: block(
      busanPortId,
      "busan-connectivity",
      "Lựa chọn phù hợp",
      "eSIM cài trước hoặc SIM địa phương; cần kiểm tra hỗ trợ hotspot.",
      [],
      communityConfirmedTrust,
      communitySource,
    ),
    mobileOperators: [],
    esimProducts: [koreaLocalProduct, asiaSailProduct, asiaPlusProduct],
    physicalSim: [],
    wifi: [
      block(
        busanPortId,
        "busan-wifi",
        "Wi-Fi",
        "Chưa xác nhận điểm Wi-Fi gần terminal.",
        [],
        unknownTrust,
      ),
    ],
  },
  services: {
    categories: [
      {
        id: "busan-atm",
        label: "ATM và đổi tiền",
        recommendations: [
          {
            place: place(
              busanPortId,
              "place-busan-atm",
              "Gate ATM (sample)",
              "atm",
              "Location requires confirmation",
              needsConfirmationTrust,
              ["international-card-unconfirmed"],
              15,
              20,
            ),
            reasonCodes: ["reported-near-gate", "needs-confirmation"],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "busan-shopping",
        label: "Mua sắm",
        recommendations: [],
        totalAvailable: 0,
      },
      {
        id: "busan-food",
        label: "Ăn uống",
        recommendations: [
          {
            place: place(
              busanPortId,
              "place-busan-food",
              "Quick Meal Stop (sample)",
              "food",
              "Outside terminal",
              needsConfirmationTrust,
              ["fast-service"],
              18,
              50,
            ),
            reasonCodes: ["reported-fast-service", "needs-confirmation"],
            estimatedCost: [money(12000, "KRW")],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "busan-medical",
        label: "Y tế và nhà thuốc",
        recommendations: [],
        totalAvailable: 0,
      },
      {
        id: "busan-welfare",
        label: "Welfare",
        recommendations: [],
        totalAvailable: 0,
      },
    ],
  },
  community: {
    reviews: [
      review(
        "review-busan-1",
        busanPortId,
        "Thuyền viên Ẩn danh",
        "Shuttle từng có nhưng lịch có thể đổi theo terminal.",
        ["shuttle", "needs-confirmation"],
        needsConfirmationTrust,
      ),
    ],
    openConfirmationCount: 7,
    contributionPrompt: "Bạn vừa ghé Busan? Hãy xác nhận gate và shuttle.",
  },
  dataHealth: {
    coverage: "partial",
    missingAreas: ["required-documents", "medical", "welfare", "wifi-hours"],
    conflictingAreas: [],
    trust: needsConfirmationTrust,
  },
} as const satisfies PortHubReadModel;
