import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { UserMenu } from "./user-menu";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">AI Course Builder</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {isAuthenticated && user?.role === "creator" && (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-dashboard"
              >
                Dashboard
              </Link>
              <Link
                href="/analytics"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-analytics"
              >
                Analytics
              </Link>
            </>
          )}
          {isAuthenticated && user?.role === "member" && (
            <Link
              href="/library"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-library"
            >
              My Courses
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
