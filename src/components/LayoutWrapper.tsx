'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

// Pages where navbar and footer should be hidden
const authPages = ['/auth/login', '/auth/register', '/pending', '/rejected'];

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Check if current page is an auth page
    const isAuthPage = authPages.some(page => pathname?.startsWith(page));

    if (isAuthPage) {
        // Hide navbar and footer on auth pages
        return (
            <main className="flex-1">
                {children}
            </main>
        );
    }

    // Show navbar and footer on all other pages
    return (
        <>
            <Navbar />
            <main className="flex-1 pt-16">
                {children}
            </main>
            <Footer />
        </>
    );
}
