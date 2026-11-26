import PasswordInput from '../../components/PasswordInput';
import {redirect} from 'next/navigation';
import {getUser} from '../../lib/auth';
import {ActionForm, Submit} from '../../components/Form';

export default async function Login() {
  if (await getUser()) redirect('/dashboard');
  return <main className="login-page"><section className="login-hero"><div style={{fontSize: 12, fontWeight: 800, letterSpacing: '.12em', marginBottom: 35}}>GUDANG MERAH PUTIH</div><h1>Kelola gudang lebih rapi, cepat, dan terukur.</h1><p>Satu sistem untuk mengelola data barang, stok, transaksi masuk dan keluar, pengajuan koreksi, serta laporan operasional gudang.</p><div className="hero-points"><div className="hero-point">✓ Stok dihitung otomatis dari transaksi valid</div><div className="hero-point">✓ Hak akses Admin dan Petugas Gudang</div><div className="hero-point">✓ Riwayat aktivitas untuk audit trail</div></div></section><section className="login-box"><div className="login-card"><div className="login-logo">GM</div><h2>Selamat datang</h2><p>Masuk ke sistem manajemen gudang.</p>
    <ActionForm action="POST /api/auth/login" className="login-form">
      <div className="field"><label htmlFor="username">Username</label><input id="username" className="input" name="username" placeholder="Masukkan username" autoComplete="username" required/></div>
      <div className="field"><label htmlFor="password">Password</label><PasswordInput id="password" name="password" placeholder="Masukkan password" autoComplete="current-password" required/></div>
      <Submit>Masuk ke Sistem</Submit>
    </ActionForm>
    <div className="demo-box">Lupa password? Hubungi Admin untuk reset password.</div></div></section></main>;
}
