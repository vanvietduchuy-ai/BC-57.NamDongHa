// Chặn build trên Vercel khi chưa khai báo biến môi trường Supabase (tránh đưa lên bản web trắng trang)
const thieu = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !process.env[k]);
if (process.env.VERCEL && thieu.length) {
  console.error(`\n✗ Thiếu biến môi trường: ${thieu.join(', ')}\n  Vào Vercel › Project › Settings › Environment Variables để khai báo rồi Redeploy.\n`);
  process.exit(1);
}
if (process.env.VITE_CHE_DO_THU === '1' && process.env.VERCEL_ENV === 'production') {
  console.error('\n✗ Không bật VITE_CHE_DO_THU trên bản chính thức.\n');
  process.exit(1);
}
