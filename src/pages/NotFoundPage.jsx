import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from '../components/Brand';

export default function NotFoundPage() {
  return <main className="grid min-h-screen place-items-center bg-[#fbefec] p-6 text-center"><div><Brand /><p className="mt-10 font-inter text-8xl font-black text-[#ff7438]">404</p><h1 className="mt-4 text-3xl font-black">الصفحة غير موجودة</h1><p className="mt-3 font-medium text-slate-500">قد يكون الرابط تغيّر أو لم يعد متاحاً.</p><Link to="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#171c1e] px-6 py-3.5 font-black text-white">العودة للرئيسية <ArrowLeft className="h-5 w-5" /></Link></div></main>;
}
