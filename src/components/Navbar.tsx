import { Link, useLocation } from 'react-router-dom';
import { Package, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const location = useLocation();
  const { isAdmin, signOut } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
          <Package className="h-6 w-6 text-accent" />
          <span>slad<span className="text-accent">alogi.site</span></span>>
        </Link>
        <nav className="flex items-center gap-2">
          {isAdmin && isAdminRoute ? (
            <>
              <Link to="/admin/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>Logout</Button>
            </>
          ) : (
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <Shield className="h-4 w-4 mr-1" /> Admin
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
