import type L from "leaflet";

export const FACILITY_TYPES = [
  {
    value: "asds",
    label: "放課後等デイサービス",
    description:
      "学校教育法第一条に規定する学校（幼稚園及び大学を除く。）に就学している障害児につき、授業の終了後又は休業日に、生活能力の向上のために必要な訓練、社会との交流の促進その他の便宜を供与する。",
  },
  {
    value: "sept-a",
    label: "就労継続支援A",
    description:
      "一般企業等での就労が困難な障害者のうち、雇用契約に基づき、継続的に就労することが可能な65歳未満の者について、生産活動その他の活動の機会を提供するとともに、就労に必要な知識及び能力の向上のために必要な訓練や支援を行う。",
  },
  {
    value: "sept-b",
    label: "就労継続支援B",
    description:
      "一般企業等での就労が困難な障害者のうち、通常の事業所に雇用されていた障害者であってその年齢、心身の状態その他の事情により引き続き当該事業所に雇用されることが困難となった者、就労移行支援によっても通常の事業所に雇用されるに至らなかった者等について、生産活動その他の活動の機会を提供するとともに、就労に必要な知識及び能力の向上のために必要な訓練や支援を行う。",
  },
  {
    value: "pco",
    label: "計画相談事業所",
    description: "サービス利用支援及び継続サービス利用支援を行う。",
  },
  {
    value: "ccd",
    label: "障害児相談支援事業所",
    description: "障害児支援利用援助及び継続障害児支援利用援助を行う。",
  },
];

export const COLORBAR_SETTINGS = {
  default: 2000,
  min: 500,
  max: 5000,
  step: 100,
};

export const MAP_SETTINGS: {
  center: L.LatLngTuple;
  zoom: number;
  tileSize: number;
  opacity?: number;
} = {
  center: [35.660154, 139.457],
  zoom: 11,
  tileSize: 256,
  opacity: 0.4,
};
