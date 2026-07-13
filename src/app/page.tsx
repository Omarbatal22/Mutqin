import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  BookOpen, 
  CheckCircle, 
  MessageSquareX, 
  History, 
  Smartphone, 
  Users, 
  ArrowLeft,
  Sparkles,
  Award
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50 dark:bg-[#121212] islamic-pattern">
      {/* Navigation Header */}
      <header className="px-6 lg:px-16 h-18 flex items-center justify-between bg-white/70 dark:bg-[#1c1c1a]/70 backdrop-blur-md border-b border-stone-200/50 dark:border-stone-850/50 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-primary-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-stone-900 dark:text-stone-100 font-display">مُتقِن</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-semibold">تسجيل الدخول</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-bold">ابدأ الآن مجاناً</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 px-6 lg:px-16 flex flex-col items-center justify-center text-center overflow-hidden">
          {/* Subtle gradient highlights */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl -z-10" />
          
          <div className="max-w-3xl flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 border border-primary-200/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>البديل المنظم لمجموعات الواتساب</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-stone-900 dark:text-stone-50 font-display">
              نظّم تقارير حلقتك اليومية، واعرف من أرسل ومن لم يرسل في ثوانٍ
            </h1>
            
            <p className="text-base md:text-lg text-stone-600 dark:text-stone-400 max-w-2xl leading-relaxed">
              منصة &quot;مُتقِن&quot; تسهّل على طلاب حلقات تحفيظ القرآن الكريم إرسال تقارير الحفظ والمراجعة اليومية، وتوفر للمعلمين لوحة متابعة فورية لمراقبة الأداء والالتزام.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 mt-4 w-full sm:w-auto">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 shadow-md shadow-primary-600/10">
                  إنشاء حلقة جديدة
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold">
                  تسجيل الدخول
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-20 bg-white dark:bg-[#1c1c1a] border-y border-stone-200/50 dark:border-stone-850/50 px-6 lg:px-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl md:text-3xl font-bold font-display">لماذا مجموعات WhatsApp لم تعد كافية؟</h2>
              <p className="text-stone-500 mt-2 text-sm">مجموعات الواتساب سهلة للتواصل، لكنها تصبح عائقاً مع زيادة أعداد الطلاب والتقارير اليومية.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl border border-stone-150 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/35">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-950/20 text-red-650 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquareX className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base mb-2">تقارير تضيع في المحادثات</h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  تتراكم الرسائل والتقارير اليومية في مجموعات الواتساب مما يجعل من الصعب قراءتها أو فرزها دون تشتيت.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-stone-150 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/35">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-950/20 text-red-650 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base mb-2">صعوبة معرفة من لم يرسل</h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  يحتاج المعلم للبحث اليدوي بين الأسماء لمعرفة الطلاب الذين تخلفوا عن إرسال تقاريرهم لهذا اليوم.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-stone-150 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/35">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-950/20 text-red-650 rounded-xl flex items-center justify-center mb-4">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base mb-2">عدم وجود سجل تراكمي</h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  لا يوجد أرشيف منظم لكل طالب يوضح التزامه وحفظه اليومي لمقارنة مستواه عبر الشهور والأسابيع.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-6 lg:px-16 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-bold font-display">كيف تعمل منصة مُتقِن؟</h2>
            <p className="text-stone-500 mt-2 text-sm">أربع خطوات بسيطة تفصلك عن تنظيم تقارير حلقتك وسجلات طلابك.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/20 text-primary-650 rounded-2xl flex items-center justify-center font-bold text-lg mb-4 border border-primary-200/50">
                1
              </div>
              <h3 className="font-bold text-base mb-1.5">أنشئ الحلقة</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                يسجل المعلم حسابه وينشئ الحلقة التعليمية ليحصل فوراً على كود الدعوة ورابط المشاركة.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/20 text-primary-650 rounded-2xl flex items-center justify-center font-bold text-lg mb-4 border border-primary-200/50">
                2
              </div>
              <h3 className="font-bold text-base mb-1.5">ادعُ الطلاب</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                يقوم المعلم بنسخ كود الحلقة أو رابط الدعوة ومشاركته مع طلاب الحلقة عبر الواتساب.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/20 text-primary-650 rounded-2xl flex items-center justify-center font-bold text-lg mb-4 border border-primary-200/50">
                3
              </div>
              <h3 className="font-bold text-base mb-1.5">الطلاب ينضمون</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                يضغط الطلاب على الرابط، وينشئون حساباتهم للانضمام المباشر للحلقة بخطوة واحدة.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/20 text-primary-650 rounded-2xl flex items-center justify-center font-bold text-lg mb-4 border border-primary-200/50">
                4
              </div>
              <h3 className="font-bold text-base mb-1.5">أرسل وتابع يومياً</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                يرسل الطلاب تقاريرهم في ثوانٍ، وتظهر حالة التسليم والإحصائيات للمعلم لحظياً.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white dark:bg-[#1c1c1a] border-t border-stone-200/50 dark:border-stone-850/50 px-6 lg:px-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl md:text-3xl font-bold font-display">مزايا مخصصة للتحفيظ والالتزام</h2>
              <p className="text-stone-500 mt-2 text-sm">تم تصميم كل شاشة لتجعل تجربة الطالب سريعة جداً وتجربة المعلم واضحة وفعالة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/20 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1.5">تجربة هاتف ممتازة للطلاب</h3>
                  <p className="text-xs text-stone-550 leading-relaxed">
                    يعتمد الطلاب غالباً على الهواتف، لذا صممنا نموذج إرسال التقرير ليكون خفيفاً وسريعاً بلمسات بسيطة، بدون تعقيد أو كتابة طويلة.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/20 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1.5">لوحة متابعة فورية للمعلم</h3>
                  <p className="text-xs text-stone-550 leading-relaxed">
                    من خلال نظرة واحدة سيعرف المعلم كم طالباً أرسل تقريره اليوم، ومن لم يرسل بعد، مع إمكانية تصفية القوائم وعرض التقارير بالتفصيل.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/20 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1.5">أرشيف وسجل تراكمي للطلاب</h3>
                  <p className="text-xs text-stone-550 leading-relaxed">
                    سجل كامل لكل تقرير تم إرساله يوضح التاريخ، الحفظ، المراجعة، وعدد الأخطاء. يسهّل على المعلم مراجعة تطور الطالب طوال فترة دراسته.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/20 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1.5">بناء نظام مرن وقابل للتوسع</h3>
                  <p className="text-xs text-stone-550 leading-relaxed">
                    تسمح البنية التقنية للمنصة بدعم أدوار متعددة مستقبلاً، مثل مساعدي المعلمين ومتابعة الاختبارات وخطط الحفظ دون تعقيد الـ MVP الحالي.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner Section */}
        <section className="py-20 px-6 lg:px-16 flex flex-col items-center justify-center text-center bg-primary-850 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-700 via-primary-900 to-primary-950 -z-10" />
          <div className="max-w-2xl flex flex-col items-center gap-6">
            <h2 className="text-2xl md:text-4xl font-extrabold font-display leading-tight">
              ابدأ في تنظيم حلقات تحفيظ القرآن الكريم رقمياً اليوم
            </h2>
            <p className="text-sm md:text-base text-primary-200/90 max-w-lg leading-relaxed">
              انضم مجاناً الآن وسهّل عملية متابعة تقارير الطلاب اليومية ووفر الوقت والمجهود الإداري.
            </p>
            <Link href="/register" className="mt-2">
              <Button size="lg" className="bg-white hover:bg-stone-100 text-primary-900 font-bold border-none shadow-md">
                ابدأ رحلتك مجاناً
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-stone-200/50 dark:border-stone-850/50 bg-white dark:bg-[#121212] text-center text-xs text-stone-500 dark:text-stone-400">
        <p>حقوق النشر © {new Date().getFullYear()} مُتقِن. جميع الحقوق محفوظة.</p>
        <p className="mt-1 text-[10px] text-stone-400">منصة مخصصة لخدمة كتاب الله وتسهيل عمل حلقات القرآن الكريم.</p>
      </footer>
    </div>
  )
}
