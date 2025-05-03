import { json, type MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = () => json({});

/**
 * Landing page component for Bolt
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      
      {/* Hiring page navigation button - fixed position */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link 
          to="/hiring" 
          className="flex items-center gap-2 px-4 py-3 bg-bolt-elements-interactive-primary hover:bg-bolt-elements-interactive-primary-hover text-bolt-elements-background-depth-1 rounded-md shadow-lg transition-all duration-300 font-medium"
        >
          <span className="i-carbon:user-profile text-xl"></span>
          <span>Hiring Portal</span>
        </Link>
      </div>
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
