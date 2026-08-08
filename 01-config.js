// إعداد الاتصال بـ Supabase، ألوان التصميم، وشعار المختبر الافتراضي — يجب تحميله أولاً (كل الملفات التالية تعتمد عليه)

const { useState, useEffect } = React;

// =============================================================================
// ⚠️ إعداد الاتصال — الصقّ هنا بيانات مشروعك من Supabase (Project Settings > API)
// =============================================================================
const SUPABASE_URL = "https://fkyljqnuraedyozasfwm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Xs-Y4dG7OSN17fyffPzqwA_8o8SwH0F";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  bg: '#F5F6F2', surface: '#FFFFFF', ink: '#1C2622', inkMuted: '#5B665F', inkFaint: '#8A948C',
  line: '#E1E4DD', accent: '#2B6472', accentDark: '#1E4B56', accentSoft: '#E4EEEF',
  normal: '#3F7A52', normalSoft: '#E6F0E7', warning: '#B8842C', warningSoft: '#F5EBD8',
  critical: '#B3402A', criticalSoft: '#F5E2DD', criticalDeep: '#7A1F12', criticalDeepSoft: '#EFC9BC',
  muted: '#ECECE8',
};

const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASUAAADcCAYAAAA2jbcSAAD2ZElEQVR42ry9d7wtV3ElvGp3n3DDuy/pKSGQQAiRk8ggGZNtsI2NwQbjBDYenHEezziOwxicxxgDNrYBg7FNxmBEDiJIBCEJUM5Zeunmc073[...]";
