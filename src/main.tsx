import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { khoiDongUngDung } from './lib/ungDung';

khoiDongUngDung();

const root = createRoot(document.getElementById('root')!);
const thieuCauHinh = import.meta.env.VITE_CHE_DO_THU !== '1' && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY);

if (thieuCauHinh) {
  // Chưa khai báo biến môi trường Supabase: báo rõ thay vì trắng trang
  root.render(
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#F4F1EC', color: '#1F1A17' }}>
      <div style={{ maxWidth: 560, background: '#fff', border: '1px solid #E4DED3', borderRadius: 20, padding: 28, lineHeight: 1.6 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, color: '#A4161A' }}>Web chưa được cấu hình kết nối dữ liệu</h1>
        <p style={{ margin: '0 0 12px' }}>Thiếu biến môi trường <b>VITE_SUPABASE_URL</b> và/hoặc <b>VITE_SUPABASE_ANON_KEY</b>.</p>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Vercel › Project › <b>Settings › Environment Variables</b>: thêm 2 biến trên (lấy ở Supabase › Project Settings › API).</li>
          <li>Vercel › <b>Deployments</b> › bản mới nhất › <b>⋯ › Redeploy</b>.</li>
        </ol>
      </div>
    </div>,
  );
} else {
  void import('./App').then(({ default: App }) => root.render(<StrictMode><App /></StrictMode>));
}
