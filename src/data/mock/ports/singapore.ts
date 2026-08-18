import type { PortHubReadModel } from "../../../types";
import { mockConnectivityProducts } from "../connectivity-products";
import {
  communityConfirmedTrust,
  communitySource,
  createKnowledgeMeta,
  officialSource,
  officialTrust,
} from "../fixture-builders";
import { singaporePortSearchEntry } from "../port-search-index";
import { block, money, place, review } from "../scenario-builders";

const [asiaSailProduct, asiaPlusProduct, singaporeLocalProduct] =
  mockConnectivityProducts;
const singaporePortId = singaporePortSearchEntry.port.id;

const singaporeAccess = {
  shoreLeave: block(
    singaporePortId,
    "sg-shore-leave",
    "Shore leave",
    "Được phép lên bờ khi có giấy tờ tàu xác nhận.",
    ["Kiểm tra lại giờ trực với sĩ quan trước khi rời tàu."],
    officialTrust,
    officialSource,
  ),
  requiredDocuments: block(
    singaporePortId,
    "sg-documents",
    "Giấy tờ",
    "Mang seaman book và shore pass do tàu cấp.",
    ["Không dùng dữ liệu mẫu này thay cho hướng dẫn của agent."],
    officialTrust,
    officialSource,
  ),
  terminalAccess: block(
    singaporePortId,
    "sg-terminal-access",
    "Terminal và gate",
    "Đi shuttle nội bộ đến gate; không đi bộ trong terminal.",
    ["Điểm đón thay đổi theo berth."],
    officialTrust,
    officialSource,
  ),
  transport: [
    block(
      singaporePortId,
      "sg-shuttle",
      "Shuttle",
      "Crew shuttle đến gate theo chuyến.",
      ["Xác nhận chuyến cuối trước khi rời tàu."],
      communityConfirmedTrust,
      communitySource,
    ),
    block(
      singaporePortId,
      "sg-taxi",
      "Taxi và ride-hailing",
      "Có thể đón tại khu vực ngoài gate.",
      ["Khoảng giá mẫu đến khu trung tâm: 18–28 SGD."],
      communityConfirmedTrust,
      communitySource,
    ),
  ],
  returnToShip: block(
    singaporePortId,
    "sg-return",
    "Quay lại tàu",
    "Có mặt tại gate ít nhất 60 phút trước giờ phải về tàu.",
    ["Dành thêm thời gian cho shuttle và kiểm tra an ninh."],
    officialTrust,
    officialSource,
  ),
} as const;

export const singaporeScenario = {
  port: singaporePortSearchEntry.port,
  terminals: singaporePortSearchEntry.terminals,
  criticalInformation: [],
  quickBrief: [
    {
      id: "sg-brief-access",
      label: "Lên bờ",
      value: "Được phép; cần shore pass",
      emphasis: "positive",
      meta: createKnowledgeMeta(singaporePortId, officialTrust, {
        source: officialSource,
      }),
    },
    {
      id: "sg-brief-return",
      label: "Buffer quay lại",
      value: "Tối thiểu 60 phút",
      emphasis: "caution",
      meta: singaporeAccess.returnToShip.meta,
    },
    {
      id: "sg-brief-internet",
      label: "Kết nối",
      value: "eSIM khu vực hoặc SIM địa phương",
      emphasis: "normal",
      meta: createKnowledgeMeta(singaporePortId, communityConfirmedTrust, {
        source: communitySource,
      }),
    },
  ],
  overview: {
    decisionSummary:
      "Dữ liệu mẫu đầy đủ: ưu tiên shuttle đến gate, giữ buffer 60 phút và chuẩn bị eSIM trước khi rời tàu.",
    weatherPlaceholder: "Dữ liệu thời tiết chỉ tải khi người dùng yêu cầu.",
    items: [
      block(
        singaporePortId,
        "sg-overview-currency",
        "Tiền tệ",
        "Singapore dollar (SGD); thẻ quốc tế phổ biến.",
        ["Luôn kiểm tra DCC trước khi xác nhận thanh toán."],
        officialTrust,
        officialSource,
      ),
      block(
        singaporePortId,
        "sg-overview-language",
        "Ngôn ngữ",
        "Tiếng Anh được sử dụng rộng rãi.",
        [],
        officialTrust,
        officialSource,
      ),
    ],
  },
  access: singaporeAccess,
  internet: {
    bestOption: block(
      singaporePortId,
      "sg-best-connectivity",
      "Lựa chọn phù hợp",
      "eSIM cài trước khi cập cảng giúp giảm thời gian tìm SIM.",
      ["Giá và vùng phủ trong prototype chỉ là dữ liệu mẫu."],
      communityConfirmedTrust,
      communitySource,
    ),
    mobileOperators: [
      block(
        singaporePortId,
        "sg-operator",
        "Mạng di động",
        "Phủ sóng mẫu được ghi nhận tốt quanh gate.",
        ["Tín hiệu trong cabin có thể khác theo vị trí tàu."],
        communityConfirmedTrust,
        communitySource,
      ),
    ],
    esimProducts: [singaporeLocalProduct, asiaSailProduct, asiaPlusProduct],
    physicalSim: [
      block(
        singaporePortId,
        "sg-physical-sim",
        "SIM vật lý",
        "Có tại cửa hàng tiện lợi ngoài gate.",
        ["Có thể yêu cầu hộ chiếu để kích hoạt."],
        communityConfirmedTrust,
        communitySource,
      ),
    ],
    wifi: [
      block(
        singaporePortId,
        "sg-wifi",
        "Wi-Fi",
        "Wi-Fi mẫu có tại seafarers’ centre.",
        ["Không giả định có Wi-Fi tại mọi berth."],
        communityConfirmedTrust,
        communitySource,
      ),
    ],
  },
  services: {
    categories: [
      {
        id: "sg-atm",
        label: "ATM và đổi tiền",
        recommendations: [
          {
            place: place(
              singaporePortId,
              "place-sg-atm",
              "Harbour ATM (sample)",
              "atm",
              "Outside Main Gate",
              communityConfirmedTrust,
              ["international-card", "dcc-choice"],
              8,
              15,
            ),
            reasonCodes: ["near-gate", "international-card-supported"],
            estimatedCost: [money(5, "SGD")],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "sg-shopping",
        label: "Mua sắm",
        recommendations: [
          {
            place: place(
              singaporePortId,
              "place-sg-shop",
              "Harbour Convenience (sample)",
              "shopping",
              "Outside Main Gate",
              communityConfirmedTrust,
              ["essentials-basket", "open-late"],
              10,
              25,
            ),
            reasonCodes: ["essential-basket-available", "fits-short-leave"],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "sg-food",
        label: "Ăn uống",
        recommendations: [
          {
            place: place(
              singaporePortId,
              "place-sg-food",
              "Gate Food Court (sample)",
              "food",
              "Outside Main Gate",
              communityConfirmedTrust,
              ["fast-service", "halal-options"],
              12,
              45,
            ),
            reasonCodes: ["fast-service", "dietary-options-recorded"],
            estimatedCost: [money(12, "SGD")],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "sg-medical",
        label: "Y tế và nhà thuốc",
        recommendations: [
          {
            place: place(
              singaporePortId,
              "place-sg-pharmacy",
              "Harbour Pharmacy (sample)",
              "pharmacy",
              "Outside Main Gate",
              officialTrust,
              ["pharmacy", "international-card"],
              14,
              30,
            ),
            reasonCodes: ["official-directory-source", "near-gate"],
          },
        ],
        totalAvailable: 1,
      },
      {
        id: "sg-welfare",
        label: "Welfare",
        recommendations: [
          {
            place: place(
              singaporePortId,
              "place-sg-welfare",
              "Seafarers’ Centre (sample)",
              "welfare",
              "Near terminal gate",
              officialTrust,
              ["wifi", "contact", "return-transport-recorded"],
              6,
              40,
            ),
            reasonCodes: ["verified-contact", "wifi-available"],
          },
        ],
        totalAvailable: 1,
      },
    ],
  },
  community: {
    reviews: [
      review(
        "review-sg-1",
        singaporePortId,
        "Máy trưởng Ẩn danh",
        "Shuttle dễ tìm; nên hỏi giờ chuyến cuối trước khi xuống tàu.",
        ["shuttle", "return-buffer"],
        communityConfirmedTrust,
      ),
    ],
    openConfirmationCount: 2,
    contributionPrompt: "Xác nhận nhanh thông tin shuttle hoặc Wi-Fi.",
  },
  dataHealth: {
    coverage: "complete",
    missingAreas: [],
    conflictingAreas: [],
    trust: officialTrust,
  },
} as const satisfies PortHubReadModel;
