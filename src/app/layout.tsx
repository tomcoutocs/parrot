import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'sonner'

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Parrot - Client Portal",
  description: "Parrot client portal with role-based access for business management",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/parrot-grad.png', type: 'image/png' }
    ],
    apple: '/parrot-grad.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
        <Toaster 
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={true}
        />
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const handledElements = new WeakSet();
                
                function setupScrollbar(element) {
                  if (handledElements.has(element)) return;
                  handledElements.add(element);
                  
                  let scrollTimeout;
                  let isScrolling = false;
                  
                  function onScroll() {
                    if (!isScrolling) {
                      isScrolling = true;
                      element.classList.add('scrolling');
                    }
                    
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(function() {
                      isScrolling = false;
                      element.classList.remove('scrolling');
                    }, 500);
                  }
                  
                  element.addEventListener('scroll', onScroll, { passive: true });
                }
                
                function handleScrollbarVisibility() {
                  const candidates = document.querySelectorAll('.scrollbar-thin, .parrot-scrollbar, [class*="overflow"]');
                  candidates.forEach(function(element) {
                    const style = window.getComputedStyle(element);
                    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
                        style.overflowX === 'auto' || style.overflowX === 'scroll') {
                      setupScrollbar(element);
                    }
                  });
                }
                
                function init() {
                  handleScrollbarVisibility();
                  
                  const observer = new MutationObserver(function() {
                    handleScrollbarVisibility();
                  });
                  
                  observer.observe(document.body, {
                    childList: true,
                    subtree: true
                  });
                }
                
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', init);
                } else {
                  init();
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
