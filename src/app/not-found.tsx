import { poppins } from '@/lib/fonts';

export default function NotFound() {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] p-4 text-center">
          <h2 className="text-4xl font-black text-[#172b49] mb-4 tracking-tighter">404</h2>
          <p className="text-slate-600 mb-8 font-medium">The page you are looking for does not exist.</p>
          <a
            href="/"
            className="px-8 py-3 bg-[#4fc5df] text-white rounded-full font-bold hover:shadow-glow-sky transition-all active:scale-[0.98]"
          >
            Back to Home
          </a>
        </div>
      </body>
    </html>
  );
}
