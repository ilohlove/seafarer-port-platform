import { describe, expect, test } from "vitest";

import { enDictionary } from "../../i18n/en";
import { viDictionary } from "../../i18n/vi";

describe("reputation localization", () => {
  test("uses complete Vietnamese labels for XP events, rules and the founding achievement", () => {
    expect(viDictionary["xp.event.community_confirmed"]).toBe("Được cộng đồng xác nhận");
    expect(viDictionary["xp.event.accepted_correction"]).toBe("Đề xuất chỉnh sửa được chấp nhận");
    expect(viDictionary["xp.rule.community_confirmed"]).toBe("Được cộng đồng xác nhận");
    expect(viDictionary["xp.rule.accepted_correction"]).toBe("Đề xuất chỉnh sửa được chấp nhận");
    expect(viDictionary["achievement.founding.name"]).toBe("Người đóng góp tiên phong");
    expect(viDictionary["achievement.founding.tag"]).toBe("THỦY THỦ TIÊN PHONG");
    expect(viDictionary["achievement.founding.description"]).not.toContain("Reputation");
    expect(viDictionary["admin.reputation.launchSuccess"]).not.toMatch(/Community Confirmed|Founding Contributor|Reputation/);
    expect(viDictionary["correction.success"]).not.toContain("Correction");
  });

  test("keeps the corresponding English labels in English", () => {
    expect(enDictionary["xp.event.community_confirmed"]).toBe("Community Confirmed");
    expect(enDictionary["xp.event.accepted_correction"]).toBe("Correction accepted");
    expect(enDictionary["achievement.founding.name"]).toBe("Founding Contributor");
    expect(enDictionary["achievement.founding.tag"]).toBe("FOUNDING CREW");
  });
});
