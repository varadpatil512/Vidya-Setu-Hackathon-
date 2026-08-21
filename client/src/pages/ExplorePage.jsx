import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '../context/useScrollReveal';
import {
  BookOpen,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Sparkles,
  ChevronRight,
  Terminal,
  MessageSquare,
  Check,
  Award,
} from 'lucide-react';

export default function ExplorePage() {
  const navigate = useNavigate();
  const stepsRef = useScrollReveal('.animate-fade-up');

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-24 overflow-x-hidden">

      {/* Hero Section with Grid Backdrop & Ambient Radial Glow */}
      <section className="relative bg-vs-surface border-b border-vs-border py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">

        {/* Ambient Gradient Glow */}
        <div className="absolute top-0 left-1/3 -translate-x-1/2 w-[900px] h-[400px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/15 via-cyan-500/5 to-transparent blur-3xl pointer-events-none animate-pulse-glow" />

        {/* Technical Grid Pattern Backdrop */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-vs-accent-light border border-vs-accent/30 text-vs-accent text-xs font-semibold tracking-wide shadow-xs animate-hero-entrance" style={{ animationDelay: '0ms' }}>
              <Terminal className="w-3.5 h-3.5 text-vs-accent-cyan" />
              Grounded Skill Verification Engine
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-vs-text leading-[1.1] animate-hero-entrance" style={{ animationDelay: '100ms' }}>
              Don't just finish courses.{' '}
              <span className="block mt-1 text-vs-accent font-black tracking-tighter">
                Prove your skills.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-vs-muted text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal animate-hero-entrance" style={{ animationDelay: '200ms' }}>
              VidyaSetu bridges the gap between completion certificates and real capability. Solve challenges in a locked editor, defend your logic in an AI viva, and earn faculty-verified skill credentials.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-hero-entrance" style={{ animationDelay: '300ms' }}>
              <button
                onClick={() => navigate('/courses')}
                className="w-full sm:w-auto px-8 py-4 bg-vs-accent hover:bg-vs-accent-hover text-white font-bold text-sm rounded shadow-lg shadow-sky-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 btn-scale"
              >
                Explore Courses & Skills
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#pipeline-section"
                className="text-xs font-semibold text-vs-muted hover:text-vs-text flex items-center gap-1.5 py-2.5 px-4 rounded border border-vs-border hover:border-vs-accent/40 bg-vs-surface-2 transition-all"
              >
                Inspect Pipeline
                <ChevronRight className="w-3.5 h-3.5 text-vs-accent" />
              </a>
            </div>
          </div>

          {/* Hero Right Visual Interactive Demo Terminal Widget */}
          <div className="lg:col-span-5 animate-hero-float hidden sm:block">
            <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-100 p-5 space-y-4 relative">

              {/* Terminal Window Top Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-slate-400 text-[11px]">verification_pipeline.sh</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 text-[10px] font-bold rounded border border-emerald-800/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE VERIFICATION
                </span>
              </div>

              {/* Code Snippet */}
              <div className="bg-slate-900/90 p-4 rounded-lg font-mono text-xs leading-relaxed space-y-1 border border-slate-800">
                <p className="text-slate-500">// Student submission: solution.js</p>
                <p><span className="text-sky-400">function</span> <span className="text-amber-300">checkEvenOdd</span>(n) &#123;</p>
                <p className="pl-4"><span className="text-sky-400">return</span> n % <span className="text-purple-300">2</span> === <span className="text-purple-300">0</span> ? <span className="text-emerald-300">'Even'</span> : <span className="text-emerald-300">'Odd'</span>;</p>
                <p>&#125;</p>
              </div>

              {/* Test Case Indicator */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Automated Test Runner:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 3/3 Test Cases Passed
                </span>
              </div>

              {/* AI Viva Prompt Bubble */}
              <div className="bg-sky-950/60 border border-sky-800/60 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-sky-400 font-bold font-display">
                  <MessageSquare className="w-3.5 h-3.5" />
                  AI Viva Grounded Prompt
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  "Explain why the modulus operator <code className="bg-slate-900 px-1 rounded font-mono text-sky-300">% 2</code> determines evenness."
                </p>
              </div>

              {/* Verified Badge Footer */}
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                  <span className="font-bold text-emerald-200 font-display">Python Conditionals Skill</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-1 rounded border border-emerald-700 uppercase tracking-wider">
                  VERIFIED BADGE ISSUED
                </span>
              </div>

            </div>
          </div>

        </div>

      </section>

      {/* Asymmetric Connected Verification Pipeline Timeline */}
      <section id="pipeline-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">

        <div className="text-center space-y-2 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-vs-accent-light text-vs-accent text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            Transparent Verification Pipeline
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-vs-text tracking-tight">
            From Watching to Proving in 4 Steps
          </h2>
          <p className="text-sm text-vs-muted max-w-xl mx-auto">
            Our pipeline connects passive learning directly to evidence-backed skill badges.
          </p>
        </div>

        {/* Connected Sequence Path Timeline */}
        <div ref={stepsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {[
            {
              step: '01',
              icon: BookOpen,
              title: 'Watch Lecture',
              sub: 'Complete short, focused video modules to unlock the assignment.',
              badge: 'MODULE LOCK',
              color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800',
            },
            {
              step: '02',
              icon: Zap,
              title: 'Solve Challenge',
              sub: 'Code in a locked Monaco Editor with test runner & paste tracking.',
              badge: 'LOCKED EDITOR',
              color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
            },
            {
              step: '03',
              icon: Cpu,
              title: 'AI Viva Interview',
              sub: 'Defend your code logic in a dynamic, grounded Q&A viva session.',
              badge: 'AI ORCHESTRATION',
              color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
            },
            {
              step: '04',
              icon: ShieldCheck,
              title: 'Faculty Verified Badge',
              sub: 'Earn a faculty-backed badge logged transparently to your portfolio.',
              badge: 'FACULTY AUDIT',
              color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
            },
          ].map(({ step, icon: Icon, title, sub, badge, color }, i) => (
            <div
              key={step}
              className="animate-fade-up relative bg-vs-surface border border-vs-border hover:border-vs-accent/40 rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-lg ${color} border flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <span className="font-display font-extrabold text-2xl text-vs-subtle/50 group-hover:text-vs-accent transition-colors">
                    {step}
                  </span>
                </div>

                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-vs-accent bg-vs-accent-light px-2 py-0.5 rounded">
                  {badge}
                </span>

                <h3 className="font-display text-lg font-bold text-vs-text mt-3 group-hover:text-vs-accent transition-colors">
                  {title}
                </h3>

                <p className="text-xs text-vs-muted mt-2 leading-relaxed">
                  {sub}
                </p>
              </div>

              {/* Connecting line indicator for steps 1-3 */}
              {i < 3 && (
                <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 text-vs-subtle bg-vs-surface rounded-full p-1 border border-vs-border shadow-xs">
                  <ChevronRight className="w-3.5 h-3.5 text-vs-accent" />
                </div>
              )}
            </div>
          ))}
        </div>

      </section>

      {/* About Us Section */}
      <section id="about-us" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-vs-surface border border-vs-border rounded-xl p-8 sm:p-12 space-y-10 shadow-lg relative overflow-hidden">
          
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-vs-accent-light text-vs-accent text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              About VidyaSetu
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-vs-text tracking-tight">
              Bridging the Gap Between Online Learning & Verified Capability
            </h2>
            <p className="text-xs sm:text-sm text-vs-muted leading-relaxed">
              Traditional completion certificates prove a video was played — not that skills were learned. VidyaSetu was built to transform passive course-watching into transparent, evidence-backed engineering proof that employers and faculty can trust.
            </p>
          </div>

          {/* 3 Core Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-vs-surface-2 border border-vs-border rounded-lg space-y-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base font-bold text-vs-text">AI Viva Defence Engine</h3>
              <p className="text-xs text-vs-muted leading-relaxed">
                Our grounded Python AI orchestration service analyzes student code submissions in real-time, asking targeted viva questions specifically tailored to their code logic.
              </p>
            </div>

            <div className="p-6 bg-vs-surface-2 border border-vs-border rounded-lg space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base font-bold text-vs-text">Process Integrity & Audit</h3>
              <p className="text-xs text-vs-muted leading-relaxed">
                Snapshot timeline tracking, paste event detection, and locked coding environments ensure every submission represents authentic, unassisted student effort.
              </p>
            </div>

            <div className="p-6 bg-vs-surface-2 border border-vs-border rounded-lg space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base font-bold text-vs-text">Faculty Review & Badges</h3>
              <p className="text-xs text-vs-muted leading-relaxed">
                AI evaluation is backed by human teacher sign-off for flagged cases, generating a cryptographically shareable skill portfolio record.
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-vs-border text-center">
            <div className="p-4 bg-vs-surface-2/60 rounded border border-vs-border">
              <span className="font-display font-extrabold text-2xl text-vs-accent block">100%</span>
              <span className="text-xs text-vs-muted">Code-Backed Evidence</span>
            </div>
            <div className="p-4 bg-vs-surface-2/60 rounded border border-vs-border">
              <span className="font-display font-extrabold text-2xl text-emerald-600 dark:text-emerald-400 block">AI + Faculty</span>
              <span className="text-xs text-vs-muted">Hybrid Verification</span>
            </div>
            <div className="p-4 bg-vs-surface-2/60 rounded border border-vs-border">
              <span className="font-display font-extrabold text-2xl text-purple-600 dark:text-purple-400 block">Transparent</span>
              <span className="text-xs text-vs-muted">Public Skill Portfolio</span>
            </div>
          </div>

          {/* Action CTA */}
          <div className="text-center pt-2">
            <button
              onClick={() => navigate('/courses')}
              className="px-8 py-3.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-bold text-sm rounded shadow-lg shadow-sky-500/25 transition-all btn-scale inline-flex items-center gap-2"
            >
              Explore Skill Courses Catalog
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

    </div>
  );
}
