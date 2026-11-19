/**
 * Default Sample Project
 * Section 5: "智慧農業灌溉系統"
 */

import { SECTIONS_META } from './guides.js';

export function createDefaultProject() {
  const sections = {};
  for (const s of SECTIONS_META) {
    sections[s.key] = {
      markdown: s.template || ''
    };
  }

  return {
    id: `proj_${Date.now()}`,
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    },
    cover: {
      titleZh: '智慧農業精準灌溉管理系統',
      titleEn: 'Smart Agricultural Precision Irrigation Management System',
      organization: '國立臺灣科技大學 資訊工程學系',
      category: '大專生專題研究計畫書',
      members: [
        { name: '王小明', studentId: 'B11015001', role: '組長 / 邊緣運算與感測硬體' },
        { name: '陳小美', studentId: 'B11015002', role: '組員 / 雲端架構與微服務' },
        { name: '林大華', studentId: 'B11015003', role: '組員 / Web 儀表板與農場驗證' }
      ],
      advisors: [
        { name: '張特聘教授', title: '特聘教授兼系主任' }
      ],
      period: '2026/07 – 2027/06',
      submitDate: new Date().toISOString().slice(0, 10),
      logoImageId: null
    },
    sections,
    images: {},
    settings: {
      lineSpacing: 1.5,
      firstLineIndentChars: 2,
      justify: true,
      chapterPageBreak: true,
      tocLevels: 2,
      pageNumberStyle: '第 {n} 頁',
      dateStyle: 'roc',
      autoHeadingNumber: true
    }
  };
}
