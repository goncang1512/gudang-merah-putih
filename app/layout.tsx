import './globals.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:'Gudang Merah Putih',description:'Website Manajemen Gudang Merah Putih'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
