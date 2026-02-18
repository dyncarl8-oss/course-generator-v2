import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserMenu() {
  const { user, isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <Button onClick={login} data-testid="button-login">
        Login with Whop
      </Button>
    );
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
      <Avatar className="h-9 w-9">
        <AvatarImage src={user?.profilePicUrl || undefined} alt={user?.username || "User"} />
        <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}
