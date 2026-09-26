// Kiểm tra biến môi trường khi build trên Vercel
const thieu = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !process.env[k]);
if (thieu.length) {
  console.warn(`\n⚠ Chưa khai báo: ${thieu.join(', ')} — web sẽ hiện trang hướng dẫn cấu hình.\n  Vào Vercel › Settings › Environment Variables để thêm, rồi Redeploy.\n`);
}
if (process.env.VITE_CHE_DO_THU === '1' && process.env.VERCEL_ENV === 'production') {
  console.error('\n✗ Không bật VITE_CHE_DO_THU trên bản chính thức.\n');
  process.exit(1);
}
