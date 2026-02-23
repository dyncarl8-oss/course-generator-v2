import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Users, Zap, CheckCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">AI Course Builder</span>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by AI
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Create Professional Courses{" "}
              <span className="text-primary">in Seconds</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform any topic into a comprehensive online course with AI-powered content generation. 
              Perfect for creators who want to share knowledge without spending weeks on curriculum development.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base" data-testid="button-get-started">
                <Sparkles className="h-5 w-5 mr-2" />
                Get Started on Whop
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Create, customize, and publish courses in three simple steps
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center hover-elevate">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <CardTitle>Enter Your Topic</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Simply type in your course topic or title. Our AI understands context and creates 
                    relevant, structured content.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="text-center hover-elevate">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <CardTitle>AI Generates Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Gemini AI creates a complete curriculum with modules, lessons, and 
                    detailed educational content.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="text-center hover-elevate">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <CardTitle>Publish & Monetize</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Review, edit, and publish your course. Set it as free or paid, 
                    and start sharing with your community.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Everything You Need to Teach Online
                </h2>
                <ul className="space-y-4">
                  {[
                    "AI-powered course generation with Gemini",
                    "Structured modules and lessons",
                    "Clean, distraction-free reading experience",
                    "Free and paid course options",
                    "Whop integration for payments",
                    "Student analytics and access management",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-chart-2 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 text-center">
                  <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold">AI-Powered</p>
                  <p className="text-sm text-muted-foreground">Content Generation</p>
                </Card>
                <Card className="p-6 text-center">
                  <Zap className="h-8 w-8 text-chart-4 mx-auto mb-3" />
                  <p className="text-2xl font-bold">Instant</p>
                  <p className="text-sm text-muted-foreground">Course Creation</p>
                </Card>
                <Card className="p-6 text-center">
                  <Users className="h-8 w-8 text-chart-2 mx-auto mb-3" />
                  <p className="text-2xl font-bold">Unlimited</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </Card>
                <Card className="p-6 text-center">
                  <BookOpen className="h-8 w-8 text-chart-1 mx-auto mb-3" />
                  <p className="text-2xl font-bold">Unlimited</p>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Create Your First Course?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Install AI Course Builder on your Whop and start generating professional courses today.
            </p>
            <Button size="lg" className="h-12 px-8 text-base">
              <Sparkles className="h-5 w-5 mr-2" />
              Install on Whop
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">AI Course Builder</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Powered by Gemini AI and Whop
          </p>
        </div>
      </footer>
    </div>
  );
}
