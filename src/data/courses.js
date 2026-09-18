// Local copy of the catalog, used until Supabase answers (or when it is not configured).
// Keep in sync with supabase/migrations/20260917090000_instructors_billing_ccna_content.sql.
const MOHAMED_ID = '00000000-0000-4000-8000-000000000501';

export const instructors = [
  {
    id: MOHAMED_ID,
    slug: 'mohamed-al-misurati',
    name: 'المهندس محمد بشير المصراتي',
    nameEn: 'Eng. Mohamed Bashir Al-Misurati',
    title: "مهندس ومدرّب شبكات وحوسبة سحابية",
    titleEn: "Network & Cloud Engineer and Instructor",
    bio: "مهندس شبكات وحوسبة سحابية بخبرة ميدانية في تصميم وتشغيل شبكات المشغّلين والمؤسسات، نفّذ مشاريع عديدة في الربط والأمن والبنية السحابية والافتراضية. حاصل على CCIE Enterprise Infrastructure وعدد كبير من شهادات Cisco و VMware و Fortinet و Microsoft، ودرّب آلاف الطلبة والمهندسين في دورات عملية تبدأ من الأساسيات وتصل إلى مستوى الاحتراف، بأمثلة من قلب بيئة العمل.",
    bioEn: "A network and cloud engineer with field experience designing and running carrier and enterprise networks, delivered across connectivity, security, cloud and virtualization projects. He holds CCIE Enterprise Infrastructure along with a long list of Cisco, VMware, Fortinet and Microsoft certifications, and has trained thousands of students and engineers in hands-on courses that start from the fundamentals and reach professional level, with examples straight from real work.",
    photo: '/assets/mohamed-bashir-cutout.png',
    expertise: ["الشبكات","أمن الشبكات","الحوسبة السحابية","الافتراضية","أتمتة الشبكات"],
    expertiseEn: ["Networking","Network security","Cloud computing","Virtualization","Network automation"],
    certifications: [
      {"name":"CCIE Enterprise Infrastructure","issuer":"Cisco","logo":"/assets/certifications/ccie-enterprise.png","featured":true},
      {"name":"CCNP Enterprise","issuer":"Cisco","logo":"/assets/certifications/ccnp-enterprise.png"},
      {"name":"CCNP Security","issuer":"Cisco","logo":"/assets/certifications/ccnp-security.png"},
      {"name":"Enterprise Wireless Implementation","issuer":"Cisco Specialist","logo":"/assets/certifications/cisco-specialist.png"},
      {"name":"Enterprise SD-WAN Implementation","issuer":"Cisco Specialist","logo":"/assets/certifications/cisco-specialist-sdwan.png"},
      {"name":"Enterprise Core ENCOR 350-401","issuer":"Cisco Specialist","logo":"/assets/certifications/cisco-specialist-encor.png"},
      {"name":"Advanced Infrastructure Implementation","issuer":"Cisco Specialist","logo":"/assets/certifications/cisco-specialist-advanced-infra.png"},
      {"name":"Network Security Firepower","issuer":"Cisco Specialist","logo":"/assets/certifications/cisco-specialist-firepower.png"},
      {"name":"Security Core","issuer":"Cisco Specialist","logo":"/assets/certifications/cisco-specialist-security-core.png"},
      {"name":"CCNA 200-301","issuer":"Cisco","logo":"/assets/certifications/ccna-200-301.png"},
      {"name":"Data Center Virtualization 2022","issuer":"VMware Professional","logo":"/assets/certifications/vmware-vcp.png"},
      {"name":"Digital Workspace","issuer":"VMware Professional","logo":"/assets/certifications/vmware-vcp-dw.png"},
      {"name":"Azure Fundamentals AZ-900","issuer":"Microsoft","logo":"/assets/certifications/azure-fundamentals.png"},
      {"name":"MCSA 70-740","issuer":"Microsoft","logo":"/assets/certifications/microsoft-mcsa.png"},
      {"name":"JNCIA-Junos","issuer":"Juniper","logo":"/assets/certifications/juniper-jncia.png"},
      {"name":"NSE 4 Network Security Professional","issuer":"Fortinet","logo":"/assets/certifications/fortinet-nse4.png"},
      {"name":"NSE 3 Network Security Associate","issuer":"Fortinet","logo":"/assets/certifications/fortinet-nse3.png"},
      {"name":"NSE 2 Network Security Associate","issuer":"Fortinet","logo":"/assets/certifications/fortinet-nse2.png"},
      {"name":"NSE 1 Network Security Associate","issuer":"Fortinet","logo":"/assets/certifications/fortinet-nse1.png"},
      {"name":"HCIA Routing & Switching","issuer":"Huawei","logo":"/assets/certifications/huawei-hcia.png"},
      {"name":"RAS Technical Professional Advanced (RAS-TPA)","issuer":"Parallels","logo":"/assets/certifications/parallels-ras-tpa.png"},
      {"name":"RAS Technical Professional (RAS-TP)","issuer":"Parallels","logo":"/assets/certifications/parallels-ras-tp.png"},
      {"name":"Certified Network Security Specialist","issuer":"ICSI","logo":"/assets/certifications/icsi-network-security.png"},
      {"name":"IC3 Digital Literacy Certification","issuer":"Certiport","logo":"/assets/certifications/ic3-digital-literacy.png"}
    ],
    position: 1,
  },
];

const lessonId = (suffix) => `00000000-0000-4000-8000-00000000${suffix}`;

// Titles match the recorded file names exactly (CCNA 1 durations are added after upload).
const ccna1Lessons = [
  ['CCNA1 Introduction to Networks', 611, true],
  ['Module-1 Networking Today'],
  ['Module-2 Basic Switch and End Device Configuration'],
  ['Module-3 Protocols and Models'],
  ['Module-4 Physical Layer'],
  ['Module-5 Numbering Systems'],
  ['Module-6 Data Link Layer'],
  ['Module-7 Ethernet Switching'],
  ['Module-8 Network Layer'],
  ['Module-9 Address Resolution'],
  ['Module-10 Basic Router Configuration'],
  ['Module-11 IPv4 Addressing'],
  ['Module-12 IPv6 Addressing'],
  ['Module-13 ICMP'],
  ['Module-14 Transport Layer'],
  ['Module-15 Application Layer'],
  ['Module-16 Network Security Fundamentals'],
  ['Module-17 Build a Small Network'],
].map(([title, durationSeconds = 0, isPreview = false], index) => ({
  id: lessonId(String(1101 + index)),
  title,
  titleEn: title,
  durationSeconds,
  isPreview,
}));

const ccna4Lessons = [
  ['Module-1 WAN Concepts', 6723, true],
  ['Module-2 VPN and IPsec Concepts', 5091],
  ['Module-3 Branch Connections', 2201],
  ['Module-4 Extended ACLs', 4059],
  ['Module-5 QoS Concepts', 5639],
  ['Module-6 Network Management', 4798],
  ['Module-7 Network Design', 3488],
  ['Module-8 Network Troubleshooting', 4157],
  ['Module-9 Network Virtualization', 4475],
  ['Module-10 Network Automation', 5067],
].map(([title, durationSeconds, isPreview = false], index) => ({
  id: lessonId(String(1201 + index)),
  title,
  titleEn: title,
  durationSeconds,
  isPreview,
}));

export const courses = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'ccna1-introduction-to-networks',
    code: 'CCNA 1',
    title: 'CCNA1: Introduction to Networks',
    titleEn: 'CCNA1: Introduction to Networks',
    shortTitle: 'CCNA 1',
    shortTitleEn: 'CCNA 1',
    description: 'الجزء الأول من مسار CCNA: تتعرّف على الشبكات من الصفر — النماذج والبروتوكولات، الطبقة الفيزيائية وطبقة ربط البيانات، Ethernet Switching، عنونة IPv4 و IPv6، إعداد السويتش والراوتر، وأساسيات أمن الشبكات، ثم تبني شبكة صغيرة بنفسك.',
    descriptionEn: 'Part one of the CCNA track: learn networking from scratch — models and protocols, the physical and data link layers, Ethernet switching, IPv4 and IPv6 addressing, basic switch and router configuration, and network security fundamentals, then build a small network yourself.',
    level: 'مبتدئ',
    levelEn: 'Beginner',
    durationMinutes: 1150,
    isFree: true,
    price: 0,
    availability: 'available',
    coverImage: '/assets/courses/ccna-foundations.jpg',
    instructorId: MOHAMED_ID,
    position: 1,
    outcomes: [
      'فهم نموذجي OSI و TCP/IP وكيف تنتقل البيانات عبر الشبكة',
      'الإعداد الأساسي للسويتش والراوتر وأجهزة المستخدمين',
      'تقسيم الشبكات وعنونتها باستخدام IPv4 و IPv6',
      'تطبيق أساسيات أمن الشبكات وبناء شبكة صغيرة متكاملة',
    ],
    outcomesEn: [
      'Understand the OSI and TCP/IP models and how data moves across a network',
      'Perform basic configuration of switches, routers, and end devices',
      'Subnet and address networks with IPv4 and IPv6',
      'Apply network security fundamentals and build a complete small network',
    ],
    modules: [
      { id: '00000000-0000-4000-8000-000000000211', title: 'محتوى الكورس', titleEn: 'Course content', lessons: ccna1Lessons },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    slug: 'ccna4-connecting-networks',
    code: 'CCNA 4',
    title: 'CCNA 4: Connecting Networks',
    titleEn: 'CCNA 4: Connecting Networks',
    shortTitle: 'CCNA 4',
    shortTitleEn: 'CCNA 4',
    description: 'مسار Connecting Networks: تتعمّق في ربط الشبكات الواسعة — مفاهيم WAN، شبكات VPN و IPsec، ربط الفروع، قوائم ACL الموسّعة، جودة الخدمة QoS، إدارة الشبكات وتصميمها واستكشاف أعطالها، وصولاً إلى الافتراضية وأتمتة الشبكات.',
    descriptionEn: 'Connecting Networks: go deeper into wide-area connectivity — WAN concepts, VPNs and IPsec, branch connections, extended ACLs, QoS, network management, design and troubleshooting, all the way to network virtualization and automation.',
    level: 'متوسط',
    levelEn: 'Intermediate',
    durationMinutes: 762,
    isFree: true,
    price: 0,
    availability: 'available',
    coverImage: '/assets/courses/enterprise-networking.jpg',
    instructorId: MOHAMED_ID,
    position: 2,
    outcomes: [
      'فهم تقنيات WAN وربط الفروع بالشبكة الرئيسية',
      'بناء اتصالات آمنة باستخدام VPN و IPsec',
      'ضبط قوائم ACL الموسّعة وسياسات جودة الخدمة QoS',
      'إدارة الشبكات واستكشاف أعطالها والتعرّف على الافتراضية والأتمتة',
    ],
    outcomesEn: [
      'Understand WAN technologies and connect branches to the core network',
      'Build secure connections with VPNs and IPsec',
      'Configure extended ACLs and QoS policies',
      'Manage and troubleshoot networks, and get started with virtualization and automation',
    ],
    modules: [
      { id: '00000000-0000-4000-8000-000000000212', title: 'محتوى الكورس', titleEn: 'Course content', lessons: ccna4Lessons },
    ],
  },
].map((course) => ({ ...course, lessonsCount: course.modules.reduce((total, module) => total + module.lessons.length, 0) }));

export function getAllLessons(course) {
  return course?.modules.flatMap((module) => module.lessons) ?? [];
}

export function getLesson(course, id) {
  return getAllLessons(course).find((lesson) => lesson.id === id);
}

export function getFirstLesson(course) {
  return getAllLessons(course)[0];
}
