export const instructor = {
  name: 'المهندس محمد بشير المصراتي',
  role: 'مهندس اتصالات سحابية — المدار الجديد',
  bio: 'خبرة عملية في شبكات المؤسسات، الأمن، البنية السحابية والافتراضية، يقدّم المعرفة التقنية المعقّدة بخطوات عربية واضحة وتطبيقات قريبة من بيئة العمل.',
  image: '/assets/mohamed-bashir.png',
  certifications: [
    'CCIE Enterprise',
    'CCNP Enterprise',
    'CCNP Security',
    'Cisco Certified Specialist',
    'VMware Certified Professional',
    'Fortinet NSE',
  ],
};

export const courses = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'networking-foundations-ccna',
    code: 'المسار 01',
    title: 'أساسيات الشبكات — CCNA',
    shortTitle: 'أساسيات الشبكات',
    description: 'ابدأ من الصفر: افهم مكوّنات الشبكة، نموذج OSI، العنونة، التحويل والتوجيه، ثم طبّق ما تعلّمته خطوة بخطوة.',
    level: 'مبتدئ',
    duration: '6 ساعات',
    lessonsCount: 8,
    accent: 'emerald',
    coverClass: 'from-[#dff8f2] via-[#c7f0e8] to-[#fff0e9]',
    outcomes: [
      'فهم طريقة انتقال البيانات داخل الشبكات',
      'تقسيم عناوين IPv4 وقراءة الـ Subnet',
      'إعداد أساسيات Switching وRouting',
      'بناء مختبر شبكات صغير واختباره',
    ],
    modules: [
      {
        id: '00000000-0000-4000-8000-000000000201',
        title: 'مدخل إلى عالم الشبكات',
        lessons: [
          { id: '00000000-0000-4000-8000-000000000301', title: 'كيف تعمل الشبكات؟', duration: '12:40', isPreview: true },
          { id: '00000000-0000-4000-8000-000000000302', title: 'أجهزة الشبكة ووظيفة كل جهاز', duration: '18:20' },
          { id: '00000000-0000-4000-8000-000000000303', title: 'نموذج OSI ببساطة', duration: '22:15' },
          { id: '00000000-0000-4000-8000-000000000304', title: 'مختبرك الأول', duration: '16:05' },
        ],
      },
      {
        id: '00000000-0000-4000-8000-000000000202',
        title: 'العنونة والربط',
        lessons: [
          { id: '00000000-0000-4000-8000-000000000305', title: 'فهم IPv4', duration: '25:10' },
          { id: '00000000-0000-4000-8000-000000000306', title: 'Subnetting بطريقة عملية', duration: '34:25' },
          { id: '00000000-0000-4000-8000-000000000307', title: 'أساسيات Switching', duration: '28:00' },
          { id: '00000000-0000-4000-8000-000000000308', title: 'الاختبار العملي للمسار', duration: '20:30' },
        ],
      },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    slug: 'enterprise-networking',
    code: 'المسار 02',
    title: 'الشبكات المؤسسية — من الفهم إلى التطبيق',
    shortTitle: 'الشبكات المؤسسية',
    description: 'انتقل من الأساسيات إلى تصميم شبكات مؤسسية أكثر اعتمادية، مع VLANs والتوجيه الديناميكي والأمن والمراقبة.',
    level: 'متوسط',
    duration: '8 ساعات',
    lessonsCount: 8,
    accent: 'orange',
    coverClass: 'from-[#fff0e9] via-[#fde1d4] to-[#dff8f2]',
    outcomes: [
      'تصميم شبكات VLAN وفهم Trunking',
      'تطبيق مبادئ التوجيه الديناميكي',
      'تقوية الشبكة ضد الأخطاء الشائعة',
      'قراءة مؤشرات الشبكة وتشخيص المشاكل',
    ],
    modules: [
      {
        id: '00000000-0000-4000-8000-000000000203',
        title: 'تصميم شبكة المؤسسة',
        lessons: [
          { id: '00000000-0000-4000-8000-000000000309', title: 'مبادئ التصميم القابل للتوسع', duration: '21:30', isPreview: true },
          { id: '00000000-0000-4000-8000-000000000310', title: 'VLAN وTrunking', duration: '31:10' },
          { id: '00000000-0000-4000-8000-000000000311', title: 'Inter-VLAN Routing', duration: '27:45' },
          { id: '00000000-0000-4000-8000-000000000312', title: 'Redundancy والاعتمادية', duration: '24:20' },
        ],
      },
      {
        id: '00000000-0000-4000-8000-000000000204',
        title: 'التشغيل والحماية',
        lessons: [
          { id: '00000000-0000-4000-8000-000000000313', title: 'مقدمة في OSPF', duration: '35:00' },
          { id: '00000000-0000-4000-8000-000000000314', title: 'أمن المنافذ وACL', duration: '29:40' },
          { id: '00000000-0000-4000-8000-000000000315', title: 'المراقبة واستكشاف الأعطال', duration: '32:15' },
          { id: '00000000-0000-4000-8000-000000000316', title: 'مشروع الشبكة النهائي', duration: '42:00' },
        ],
      },
    ],
  },
];

export function getCourseBySlug(slug) {
  return courses.find((course) => course.slug === slug);
}

export function getLesson(course, lessonId) {
  return course?.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === lessonId);
}

export function getFirstLesson(course) {
  return course?.modules[0]?.lessons[0];
}
