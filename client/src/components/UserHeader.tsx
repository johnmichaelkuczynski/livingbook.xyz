import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export function UserHeader() {
  const { user, logout, isLoggingOut } = useAuth();

  if (!user) return null;

  const initials = user.email
    .split('@')[0]
    .split('.')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">DocMath AI</h1>
        <span className="text-sm text-gray-500 hidden sm:inline">
          Document Processing & AI Chat
        </span>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-8 px-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-700 hidden sm:inline">
              {user.email}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm">{user.email}</span>
              <span className="text-xs text-gray-500">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={logout}
            disabled={isLoggingOut}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}