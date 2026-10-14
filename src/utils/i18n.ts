export type Language = 'en' | 'ar';

export interface Translations {
  // App Branding & Header
  appTitle: string;
  radarBadge: string;
  onlineBadge: string;
  testPager: string;
  muteAlarms: string;
  unmuteAlarms: string;
  notificationsActive: string;
  enableNotifications: string;
  googleCalendar: string;
  syncCalendar: string;
  disconnectGoogle: string;
  settingsTitle: string;
  toggleTimeFormat: string;
  langSwitchEn: string;
  langSwitchAr: string;

  // Tabs
  tabRadar: string;
  tabShifts: string;
  tabMonthPlanner: string;
  tabTasks: string;
  tabCompliance: string;
  tabIncome: string;

  // Live Radar
  activeDutyRadar: string;
  dutyOverviewSub: string;
  onDutyNow: string;
  offDutyRest: string;
  nextUpcomingDuty: string;
  biometricInStatus: string;
  biometricOutStatus: string;
  verifyBiometricIn: string;
  verifyBiometricOut: string;
  shiftHours: string;
  restPeriodAfter: string;
  nextShiftStartsAt: string;
  gracePeriodNotice: string;
  missedTimePenaltyNotice: string;

  // Month Planner
  monthPlannerTitle: string;
  monthPlannerSub: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  shiftDurationLabel: string;
  duration24h: string;
  duration18h: string;
  duration12h: string;
  mandatory6hRestNote: string;
  planningModeLabel: string;
  modeFullMonth: string;
  modeDesiredEndTime: string;
  modeCycleCount: string;
  desiredEndDateTimeLabel: string;
  desiredEndDate: string;
  desiredEndTime: string;
  incompleteCycleLabel: string;
  incompleteCycleDesc: string;
  allowIncompleteCycle: string;
  halfCycleDetected: string;
  halfCycleBadge: string;
  incompleteCycleBadge: string;
  startDateLabel: string;
  startTimeLabel: string;
  targetMonthLabel: string;
  cyclesCountLabel: string;
  hospitalDeptLabel: string;
  fingerprintStationLabel: string;
  applyMonthSchedule: string;
  rotationOverviewTitle: string;
  totalPlannedShifts: string;
  totalWorkHours: string;
  totalRestHours: string;
  totalBiometricVerifications: string;
  rotationTimespan: string;
  from: string;
  to: string;
  endsAt: string;
  cycleCardTitle: string;
  part1Label: string;
  part2Label: string;
  restPeriodTitle: string;
  nextShiftImmediate: string;
  fullMonthCalendarPlan: string;
  detailedCycleList: string;
  calendarView: string;
  cycleListView: string;
  shiftStartTime: string;
  shiftEndTime: string;
  workEndTime: string;
  restEndTime: string;
  shiftIn: string;
  shiftOut: string;
  punchIn: string;
  punchOut: string;
  shiftInVerified: string;
  shiftOutVerified: string;
  monthEndDateLabel: string;
  monthEndTimeLabel: string;
  endOfSelectedMonth: string;
  midMonthPreset: string;
  threeQuarterMonthPreset: string;
  planCutoffReached: string;
  planEndsWithinMonth: string;
  sameMonthBoundaryNote: string;

  // Monthly Income Calculator
  incomeTitle: string;
  incomeSub: string;
  hourlyRateTitle: string;
  currencyLabel: string;
  scheduledHoursLabel: string;
  missedTimeCounterLabel: string;
  netHoursAttendedLabel: string;
  hourlyPriceLabel: string;
  netMonthlyIncomeLabel: string;
  grossTotal: string;
  totalDeductions: string;
  netPayout: string;
  exportCsv: string;
  shiftLedgerTitle: string;
  shiftLedgerSub: string;
  missedMinutesEditor: string;
  excusedZeroMinutes: string;
  formulaBanner: string;

  // Common UI
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  close: string;
  days: string[];
  months: string[];
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'Hospital Duty Guard',
    radarBadge: 'Biometric Radar',
    onlineBadge: 'Biometric Online',
    testPager: 'Test Pager',
    muteAlarms: 'Mute Alarms',
    unmuteAlarms: 'Unmute Alarms',
    notificationsActive: 'Notifications Active',
    enableNotifications: 'Enable Notifications',
    googleCalendar: 'Google Calendar',
    syncCalendar: 'Sync Calendar',
    disconnectGoogle: 'Disconnect Google',
    settingsTitle: 'Settings',
    toggleTimeFormat: 'Toggle 12h/24h',
    langSwitchEn: 'English',
    langSwitchAr: 'العربية',

    tabRadar: 'Duty Radar',
    tabShifts: 'Shift Roster',
    tabMonthPlanner: 'Month Planner',
    tabTasks: 'Tasks & Alarms',
    tabCompliance: 'Biometric Log',
    tabIncome: 'Monthly Income',

    activeDutyRadar: 'Live Duty & Biometric Radar',
    dutyOverviewSub: 'Real-time monitoring of active medical shifts, biometric verification countdowns, and mandatory rest intervals.',
    onDutyNow: 'ON ACTIVE DUTY',
    offDutyRest: 'OFF DUTY (MANDATORY REST)',
    nextUpcomingDuty: 'UPCOMING NEXT DUTY',
    biometricInStatus: 'Arrival Biometric (IN)',
    biometricOutStatus: 'Departure Biometric (OUT)',
    verifyBiometricIn: 'Clock IN Fingerprint',
    verifyBiometricOut: 'Clock OUT Fingerprint',
    shiftHours: 'Duty Hours',
    restPeriodAfter: 'Mandatory 6h Rest Interval',
    nextShiftStartsAt: 'Next Shift Begins Immediately At',
    gracePeriodNotice: 'Grace window active',
    missedTimePenaltyNotice: 'Missed duty time automatically logged and discounted from payroll',

    monthPlannerTitle: 'Monthly Duty Planner',
    monthPlannerSub: 'Plan monthly shifts with 6h rest intervals and custom cutoff time.',
    step1Title: 'Choose Duty Plan',
    step1Desc: 'Select shift duration with 6 hours mandatory rest after each duty.',
    step2Title: 'Set Dates & End Time',
    step2Desc: 'Set start date, month, and cutoff time within the month.',
    step3Title: 'Review & Apply Schedule',
    step3Desc: 'Preview shifts, rest intervals, and biometric check-ins.',
    shiftDurationLabel: 'Shift Duration',
    duration24h: '24 Hours (12h+12h) + 6h Rest',
    duration18h: '18 Hours + 6h Rest',
    duration12h: '12 Hours + 6h Rest',
    mandatory6hRestNote: 'Mandatory 6h Rest: Next shift starts immediately after rest ends.',
    planningModeLabel: 'Planning Mode',
    modeFullMonth: 'Full Month',
    modeDesiredEndTime: 'Target End Time',
    modeCycleCount: 'Cycle Count',
    desiredEndDateTimeLabel: 'Target Cutoff Date & Time',
    desiredEndDate: 'End Date',
    desiredEndTime: 'End Time',
    incompleteCycleLabel: 'Allow Half-Cycle (12h)',
    incompleteCycleDesc: 'Adds a 12h half-cycle if cutoff lands before a full duty finishes.',
    allowIncompleteCycle: 'Allow 12h half-cycle at cutoff',
    halfCycleDetected: '12h half-cycle added to match cutoff',
    halfCycleBadge: 'Half Cycle (12h)',
    incompleteCycleBadge: 'Incomplete Cycle',
    startDateLabel: 'Start Date',
    startTimeLabel: 'Start Time',
    targetMonthLabel: 'Target Month',
    cyclesCountLabel: 'Number of Cycles',
    hospitalDeptLabel: 'Hospital Department',
    fingerprintStationLabel: 'Biometric Fingerprint Station',
    applyMonthSchedule: 'Apply Monthly Duty Schedule',
    rotationOverviewTitle: 'Monthly Rotation Overview & Timespan',
    totalPlannedShifts: 'Total Shifts',
    totalWorkHours: 'Total Duty Hours',
    totalRestHours: 'Total Rest Hours',
    totalBiometricVerifications: 'Biometric Punches',
    rotationTimespan: 'Timespan Coverage',
    from: 'From',
    to: 'To',
    endsAt: 'Ends at',
    cycleCardTitle: 'Cycle',
    part1Label: 'Part 1: First 12h Segment',
    part2Label: 'Part 2: Second 12h Segment',
    restPeriodTitle: 'Mandatory 6h Rest Period',
    nextShiftImmediate: 'Next Shift Starts Immediately At',
    fullMonthCalendarPlan: 'Full Month Calendar Plan',
    detailedCycleList: 'Detailed Rotation Cycles',
    calendarView: 'Calendar View',
    cycleListView: 'Cycle List View',
    shiftStartTime: 'Shift Start Time',
    shiftEndTime: 'Shift End Time',
    workEndTime: 'Work End Time',
    restEndTime: '6h Rest End Time',
    shiftIn: 'Shift In (Clock-In)',
    shiftOut: 'Shift Out (Clock-Out)',
    punchIn: 'Punch In',
    punchOut: 'Punch Out',
    shiftInVerified: 'In Verified',
    shiftOutVerified: 'Out Verified',
    monthEndDateLabel: 'End Date (Within Month)',
    monthEndTimeLabel: 'End Time (Within Month)',
    endOfSelectedMonth: 'Last Day of Month',
    midMonthPreset: 'Mid-Month (15th)',
    threeQuarterMonthPreset: 'Day 25',
    planCutoffReached: 'Month Schedule Concluded (Cutoff Reached)',
    planEndsWithinMonth: 'Plan Concludes Within Month At',
    sameMonthBoundaryNote: 'Both start and end dates/times are contained within the chosen calendar month.',

    incomeTitle: 'Monthly Duty Income & Missed Time Calculator',
    incomeSub: 'Automatically counts late or missed biometric minutes, discounts them from total hours, and calculates your exact net salary.',
    hourlyRateTitle: 'Configure Your Hourly Duty Rate',
    currencyLabel: 'Currency',
    scheduledHoursLabel: '1. Scheduled Duty Hours',
    missedTimeCounterLabel: '2. Missed Time Counter',
    netHoursAttendedLabel: '3. Net Hours Attended',
    hourlyPriceLabel: '4. Hour Price Rate',
    netMonthlyIncomeLabel: '5. Net Month Income',
    grossTotal: 'Gross Scheduled Total',
    totalDeductions: 'Total Late/Missed Deductions',
    netPayout: 'Net Monthly Payout',
    exportCsv: 'Export Payroll CSV',
    shiftLedgerTitle: 'Shift Attendance & Deduction Ledger',
    shiftLedgerSub: 'Exact breakdown of hours, missed minutes, deduction discounts, and final payout per duty shift.',
    missedMinutesEditor: 'Missed Minutes Counter',
    excusedZeroMinutes: 'Excuse (0m)',
    formulaBanner: 'Net Attended Hours × Hourly Rate = Total Month Payout',

    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },

  ar: {
    appTitle: 'رادار نوبتجيات المستشفى وبصمة الحضور',
    radarBadge: 'رادار البصمة المباشر',
    onlineBadge: 'البصمة متصلة ومفعّلة',
    testPager: 'تجربة جهاز النداء (البيجر)',
    muteAlarms: 'كتم الإنذارات',
    unmuteAlarms: 'تشغيل صوت الإنذار',
    notificationsActive: 'التنبيهات مفعلة',
    enableNotifications: 'تفعيل إشعارات المتصفح',
    googleCalendar: 'تقويم جوجل',
    syncCalendar: 'مزامنة مع تقويم جوجل',
    disconnectGoogle: 'فصل حساب جوجل',
    settingsTitle: 'الإعدادات',
    toggleTimeFormat: 'تبديل نظام 12 ساعة / 24 ساعة',
    langSwitchEn: 'English',
    langSwitchAr: 'العربية',

    tabRadar: 'رادار النوبتجية',
    tabShifts: 'جدول النوبتجيات',
    tabMonthPlanner: 'مخطط الشهر',
    tabTasks: 'المهام والإنذارات',
    tabCompliance: 'سجل البصمات',
    tabIncome: 'الراتب والخصومات',

    activeDutyRadar: 'رادار المناوبة الحية ومواعيد البصمة',
    dutyOverviewSub: 'متابعة لحظية للنوبتجية الحالية، العد التنازلي لنافذة البصمة، وفترات الراحة الإلزامية المقررة.',
    onDutyNow: 'في النوبتجية الآن (قيد العمل)',
    offDutyRest: 'فترة راحة إجبارية (خارج النوبتجية)',
    nextUpcomingDuty: 'النوبتجية القادمة التالية',
    biometricInStatus: 'بصمة الحضور (بداية الوردية)',
    biometricOutStatus: 'بصمة الانصراف (نهاية الوردية)',
    verifyBiometricIn: 'تسجيل بصمة الحضور الآن',
    verifyBiometricOut: 'تسجيل بصمة الانصراف الآن',
    shiftHours: 'ساعات العمل المقررة',
    restPeriodAfter: 'فترة راحة إجبارية (6 ساعات)',
    nextShiftStartsAt: 'تبدأ النوبتجية التالية فوراً في تمام',
    gracePeriodNotice: 'فترة السماح مفعلة حالياً',
    missedTimePenaltyNotice: 'يتم احتساب وقت التأخير بدقة بالدقائق وخصمه آلياً من الراتب الشهري',

    monthPlannerTitle: 'مخطط نوبتجيات الشهر',
    monthPlannerSub: 'تخطيط ورديات الشهر وفترات الراحة (6 ساعات) ووقت النهاية.',
    step1Title: 'اختر نظام النوبتجية',
    step1Desc: 'حدد مدة الوردية مع احتساب 6 ساعات راحة إجبارية تلقائياً.',
    step2Title: 'حدد التواريخ ووقت النهاية',
    step2Desc: 'حدد تاريخ البداية ووقت النهاية المطلوب خلال نفس الشهر.',
    step3Title: 'معاينة واعتماد الجدول',
    step3Desc: 'استعرض مواعيد الورديات وبصمات الحضور والانصراف ثم اعتمد الجدول.',
    shiftDurationLabel: 'مدة النوبتجية',
    duration24h: '24 ساعة (12+12) + 6س راحة',
    duration18h: '18 ساعة + 6س راحة',
    duration12h: '12 ساعة + 6س راحة',
    mandatory6hRestNote: 'راحة 6 ساعات: تبدأ الوردية التالية فور انتهاء فترة الراحة.',
    planningModeLabel: 'طريقة التخطيط',
    modeFullMonth: 'كامل الشهر',
    modeDesiredEndTime: 'وقت نهاية محدد',
    modeCycleCount: 'بعدد الدورات',
    desiredEndDateTimeLabel: 'موعد نهاية الروتيشن المطلوب',
    desiredEndDate: 'تاريخ النهاية',
    desiredEndTime: 'وقت النهاية',
    incompleteCycleLabel: 'السماح بنصف دورة (12س)',
    incompleteCycleDesc: 'إضافة نصف دورة (12 ساعة) تلقائياً عند حلول موعد النهاية قبل اكتمال الوردية.',
    allowIncompleteCycle: 'تفعيل نصف دورة (12س) عند نهاية الفترة',
    halfCycleDetected: 'تمت إضافة نصف دورة (12س) لتغطية موعد النهاية بدقة',
    halfCycleBadge: 'نصف دورة (12 ساعة)',
    incompleteCycleBadge: 'دورة غير مكتملة',
    startDateLabel: 'تاريخ البداية',
    startTimeLabel: 'ساعة البداية',
    targetMonthLabel: 'شهر التخطيط',
    cyclesCountLabel: 'عدد الدورات',
    hospitalDeptLabel: 'القسم الطبي / المستشفى',
    fingerprintStationLabel: 'محطة جهاز البصمة المعتمدة',
    applyMonthSchedule: 'اعتماد وتطبيق جدول نوبتجيات الشهر',
    rotationOverviewTitle: 'ملخص نطاق ومواعيد روتيشن الشهر',
    totalPlannedShifts: 'إجمالي الورديات',
    totalWorkHours: 'إجمالي ساعات العمل',
    totalRestHours: 'إجمالي ساعات الراحة',
    totalBiometricVerifications: 'عدد حركات البصمة المطلوبة',
    rotationTimespan: 'المدى الزمني للتغطية',
    from: 'من',
    to: 'إلى',
    endsAt: 'ينتهي في تمام',
    cycleCardTitle: 'دورة نوبتجية',
    part1Label: 'الجزء الأول: أول 12 ساعة عمل',
    part2Label: 'الجزء الثاني: ثاني 12 ساعة عمل',
    restPeriodTitle: 'فترة راحة إجبارية (6 ساعات)',
    nextShiftImmediate: 'تبدأ النوبتجية التالية فوراً في',
    fullMonthCalendarPlan: 'جدول تقويم الشهر بالكامل',
    detailedCycleList: 'قائمة دورات الروتيشن التفصيلية',
    calendarView: 'عرض التقويم الشهري',
    cycleListView: 'عرض قائمة الدورات',
    shiftStartTime: 'وقت بداية النوبتجية',
    shiftEndTime: 'وقت نهاية النوبتجية',
    workEndTime: 'وقت نهاية العمل',
    restEndTime: 'وقت نهاية فترة الراحة (6 ساعات)',
    shiftIn: 'بصمة الحضور (Shift In)',
    shiftOut: 'بصمة الانصراف (Shift Out)',
    punchIn: 'تسجيل الحضور',
    punchOut: 'تسجيل الانصراف',
    shiftInVerified: 'تم الحضور',
    shiftOutVerified: 'تم الانصراف',
    monthEndDateLabel: 'تاريخ النهاية (ضمن نفس الشهر)',
    monthEndTimeLabel: 'وقت النهاية (ضمن نفس الشهر)',
    endOfSelectedMonth: 'نهاية الشهر (آخر يوم)',
    midMonthPreset: 'منتصف الشهر (يوم 15)',
    threeQuarterMonthPreset: 'يوم 25',
    planCutoffReached: 'اكتمل روتيشن الشهر (تم الوصول لنهاية الخطة)',
    planEndsWithinMonth: 'تنتهي الخطة ضمن الشهر في',
    sameMonthBoundaryNote: 'تاريخ ووقت البداية والنهاية محصوران بدقة ضمن نفس الشهر التقويمي.',

    incomeTitle: 'حاسبة الراتب الشهري وخصومات الوقت الضائع',
    incomeSub: 'احتساب دقائق التأخير والغياب عن البصمة تلقائياً وخصمها من إجمالي الساعات لحساب صافي الراتب بدقة متناهية.',
    hourlyRateTitle: 'تحديد سعر ساعة النوبتجية',
    currencyLabel: 'العملة',
    scheduledHoursLabel: '1. ساعات العمل المجدولة',
    missedTimeCounterLabel: '2. عداد الوقت الضائع (بالدقائق)',
    netHoursAttendedLabel: '3. صافي ساعات الحضور الفعلي',
    hourlyPriceLabel: '4. سعر ساعة العمل',
    netMonthlyIncomeLabel: '5. صافي الراتب الشهري المستحق',
    grossTotal: 'إجمالي الراتب قبل الخصم',
    totalDeductions: 'إجمالي خصومات التأخير والوقت الضائع',
    netPayout: 'صافي الراتب المحول',
    exportCsv: 'تصدير مسير الراتب (ملف CSV)',
    shiftLedgerTitle: 'كشف حساب نوبتجيات الشهر والخصومات',
    shiftLedgerSub: 'بيان تفصيلي لكل نوبتجية، الساعات المقررة، دقائق التأخير، الخصم المالي، وصافي الأجر.',
    missedMinutesEditor: 'تعديل عداد دقائق الوقت الضائع',
    excusedZeroMinutes: 'إعفاء من الخصم (0 دقيقة)',
    formulaBanner: 'صافي ساعات الحضور الفعلي × سعر الساعة = صافي الراتب الشهري',

    save: 'حفظ التعديلات',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    months: [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ],
  },
};
