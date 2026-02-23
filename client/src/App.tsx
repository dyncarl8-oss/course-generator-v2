import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import ExperiencePage from "@/pages/experience";
import CourseViewPage from "@/pages/course-view";
import CourseEditPage from "@/pages/course-edit";
import AnalyticsPage from "@/pages/analytics";
import LandingPage from "@/pages/landing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      <Route path="/dashboard/:companyId" component={DashboardPage} />
      <Route path="/dashboard/:companyId/analytics" component={AnalyticsPage} />
      <Route path="/dashboard/:companyId/courses/:courseId/edit" component={CourseEditPage} />
      
      <Route path="/experiences/:experienceId" component={ExperiencePage} />
      <Route path="/experiences/:experienceId/courses/:courseId" component={CourseViewPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
