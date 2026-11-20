export type SheCategoryKey =
  | 'envi_issue'
  | 'envi_activity'
  | 'safety_issue'
  | 'safety_activity'
  | 'custom';

export interface SheActivityPreset {
  id: string;
  categoryKey: Exclude<SheCategoryKey, 'custom'>;
  categoryLabel: string;
  title: string;
  basePoints: number;
  supportsRemediation: boolean;
  immediateBonus: number;
  description: string;
}

export const SHE_CATEGORY_TABS: { key: SheCategoryKey; label: string }[] = [
  { key: 'envi_issue', label: 'แจ้งประเด็นสิ่งแวดล้อม' },
  { key: 'envi_activity', label: 'กิจกรรม ENVI' },
  { key: 'safety_issue', label: 'แจ้งประเด็นความปลอดภัย' },
  { key: 'safety_activity', label: 'กิจกรรม Safety' },
  { key: 'custom', label: 'กรอกเอง / อื่นๆ' },
];

export const SHE_ACTIVITY_PRESETS: SheActivityPreset[] = [
  // 1. การแจ้งประเด็นด้านสิ่งแวดล้อม
  {
    id: 'she-envi-oil-spill',
    categoryKey: 'envi_issue',
    categoryLabel: 'แจ้งประเด็นสิ่งแวดล้อม',
    title: 'แจ้งประเด็นสิ่งแวดล้อม: น้ำมันหกรั่วไหล',
    basePoints: 40,
    supportsRemediation: true,
    immediateBonus: 20,
    description: 'รับ 40 คะแนน และเพิ่มอีก 20 คะแนนเมื่อแก้ไขทันที (หรือระบุคะแนนเองหากแก้ไขภายหลัง)',
  },
  {
    id: 'she-envi-wrong-waste',
    categoryKey: 'envi_issue',
    categoryLabel: 'แจ้งประเด็นสิ่งแวดล้อม',
    title: 'แจ้งประเด็นสิ่งแวดล้อม: ทิ้งขยะผิดประเภท',
    basePoints: 20,
    supportsRemediation: true,
    immediateBonus: 20,
    description: 'รับ 20 คะแนน และเพิ่มอีก 20 คะแนนเมื่อแก้ไขทันที (หรือระบุคะแนนเองหากแก้ไขภายหลัง)',
  },
  {
    id: 'she-envi-unlabeled-chem',
    categoryKey: 'envi_issue',
    categoryLabel: 'แจ้งประเด็นสิ่งแวดล้อม',
    title: 'แจ้งประเด็นสิ่งแวดล้อม: การแบ่งถ่ายสารเคมีใส่บรรจุภัณฑ์โดยไม่ระบุชื่อสารเคมี',
    basePoints: 40,
    supportsRemediation: true,
    immediateBonus: 20,
    description: 'รับ 40 คะแนน และเพิ่มอีก 20 คะแนนเมื่อแก้ไขทันที (หรือระบุคะแนนเองหากแก้ไขภายหลัง)',
  },

  // 2. การเข้าร่วมกิจกรรม ENVI
  {
    id: 'she-envi-twoway',
    categoryKey: 'envi_activity',
    categoryLabel: 'กิจกรรม ENVI',
    title: 'กิจกรรม ENVI: Two-way Communication ผู้ตอบคำถามได้ถูกต้อง',
    basePoints: 40,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'ร่วมกิจกรรม Two-way Communication ด้านสิ่งแวดล้อมและตอบคำถามได้ถูกต้อง รับ 40 คะแนน',
  },
  {
    id: 'she-envi-training',
    categoryKey: 'envi_activity',
    categoryLabel: 'กิจกรรม ENVI',
    title: 'กิจกรรม ENVI: เข้าร่วมอบรมในส่วนงานด้าน ENVI',
    basePoints: 60,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'เข้าร่วมการอบรมในส่วนงานด้านสิ่งแวดล้อม (ENVI) รับ 60 คะแนน',
  },
  {
    id: 'she-envi-support',
    categoryKey: 'envi_activity',
    categoryLabel: 'กิจกรรม ENVI',
    title: 'กิจกรรม ENVI: มีส่วนร่วมช่วยเหลืองานด้าน ENVI',
    basePoints: 40,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'มีส่วนร่วมช่วยเหลืองานหรือสนับสนุนกิจกรรมด้าน ENVI รับ 40 คะแนน',
  },

  // 3. การแจ้งประเด็นด้านความปลอดภัย
  {
    id: 'she-safety-issue',
    categoryKey: 'safety_issue',
    categoryLabel: 'แจ้งประเด็นความปลอดภัย',
    title: 'แจ้งประเด็นด้านความปลอดภัย',
    basePoints: 40,
    supportsRemediation: true,
    immediateBonus: 20,
    description: 'แจ้งประเด็นความปลอดภัยรับ 40 คะแนน เพิ่มอีก 20 คะแนนเมื่อแก้ไขทันที (หรือระบุคะแนนเองหากแก้ไขภายหลัง)',
  },

  // 4. การเข้าร่วมกิจกรรม Safety
  {
    id: 'she-safety-talk',
    categoryKey: 'safety_activity',
    categoryLabel: 'กิจกรรม Safety',
    title: 'กิจกรรม Safety: SHE Safety Talk',
    basePoints: 20,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'เข้าร่วมกิจกรรม SHE Safety Talk รับ 20 คะแนน',
  },
  {
    id: 'she-safety-twoway',
    categoryKey: 'safety_activity',
    categoryLabel: 'กิจกรรม Safety',
    title: 'กิจกรรม Safety: Two-way Communication',
    basePoints: 20,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'เข้าร่วมกิจกรรม Two-way Communication ด้านความปลอดภัย รับ 20 คะแนน',
  },
  {
    id: 'she-safety-inspection',
    categoryKey: 'safety_activity',
    categoryLabel: 'กิจกรรม Safety',
    title: 'กิจกรรม Safety: Site Inspection',
    basePoints: 20,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'เข้าร่วมการตรวจพื้นที่ Site Inspection รับ 20 คะแนน',
  },
  {
    id: 'she-safety-quiz',
    categoryKey: 'safety_activity',
    categoryLabel: 'กิจกรรม Safety',
    title: 'กิจกรรม Safety: Safety Quiz',
    basePoints: 20,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'ร่วมตอบคำถาม Safety Quiz รับ 20 คะแนน',
  },
  {
    id: 'she-safety-training',
    categoryKey: 'safety_activity',
    categoryLabel: 'กิจกรรม Safety',
    title: 'กิจกรรม Safety: อบรมกับฝ่าย SHE',
    basePoints: 20,
    supportsRemediation: false,
    immediateBonus: 0,
    description: 'เข้าร่วมการอบรมกับฝ่าย SHE รับ 20 คะแนน',
  },
];
