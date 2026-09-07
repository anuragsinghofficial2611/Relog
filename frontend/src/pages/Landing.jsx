import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../landing.css";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: "◈",
    title: "Smart detection",
    text: "Relog scans every line for errors, exceptions, and warnings — then pulls in the context that matters.",
  },
  {
    icon: "◎",
    title: "AI explanations",
    text: "Groq-powered summaries turn cryptic stack traces into clear causes and next steps in seconds.",
  },
  {
    icon: "◫",
    title: "Batch or stream",
    text: "Paste logs in the dashboard or run the lightweight agent beside your service for continuous monitoring.",
  },
  {
    icon: "⚷",
    title: "API keys & history",
    text: "Every analysis is saved to your workspace. Issue API keys for agents and revisit past findings anytime.",
  },
];

const STEPS = [
  { n: "01", title: "Connect", text: "Sign in, paste logs, or point the relog-agent at your log file." },
  { n: "02", title: "Analyze", text: "Rule-based detection flags failures; AI explains what went wrong." },
  { n: "03", title: "Act", text: "Review reports in your dashboard, track history, and fix issues faster." },
];

export default function Landing() {
  const root = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lp-nav", {
        y: -40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      gsap.from(".lp-hero-badge, .lp-hero h1, .lp-hero-sub, .lp-hero-cta, .lp-hero-stats", {
        y: 48,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from(".lp-terminal", {
        x: 60,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        delay: 0.45,
      });

      gsap.to(".lp-orb-a", {
        x: 30,
        y: -20,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".lp-orb-b", {
        x: -25,
        y: 35,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.utils.toArray(".lp-feature-card").forEach((el, i) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: "top 88%" },
          y: 50,
          opacity: 0,
          duration: 0.7,
          delay: i * 0.08,
          ease: "power2.out",
        });
      });

      gsap.utils.toArray(".lp-step").forEach((el, i) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: "top 90%" },
          x: i % 2 ? 40 : -40,
          opacity: 0,
          duration: 0.75,
          ease: "power2.out",
        });
      });

      gsap.from(".lp-cta-inner", {
        scrollTrigger: { trigger: ".lp-cta", start: "top 80%" },
        scale: 0.92,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.4)",
      });

      gsap.from(".lp-footer-col", {
        scrollTrigger: { trigger: ".lp-footer", start: "top 95%" },
        y: 24,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
      });

      const lines = gsap.utils.toArray(".lp-term-line");
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });
      lines.forEach((line, i) => {
        tl.from(line, { opacity: 0, x: -8, duration: 0.35, ease: "power1.out" }, i * 0.5);
      });
      tl.to(".lp-term-result", { opacity: 1, duration: 0.5 }, lines.length * 0.5 + 0.3);
      tl.to(".lp-term-result", { opacity: 0, duration: 0.3 }, "+=3");
      tl.set(lines, { opacity: 0 });
      tl.set(".lp-term-result", { opacity: 0 });
    }, root);

    return () => ctx.revert();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="lp" ref={root}>
      <div className="lp-bg">
        <div className="lp-orb lp-orb-a" />
        <div className="lp-orb lp-orb-b" />
        <div className="lp-grid" />
      </div>

      <nav className="lp-nav">
        <a href="#" className="lp-logo" onClick={(e) => e.preventDefault()}>
          <b>R</b> relog
        </a>
        <div className="lp-nav-links">
          <button type="button" onClick={() => scrollTo("features")}>
            Features
          </button>
          <button type="button" onClick={() => scrollTo("how")}>
            How it works
          </button>
          <button type="button" onClick={() => scrollTo("about")}>
            About
          </button>
        </div>
        <div className="lp-nav-actions">
          <Link to="/login" className="lp-btn-ghost">
            Sign in
          </Link>
          <Link to="/app" className="lp-btn-primary">
            Get started →
          </Link>
        </div>
      </nav>

      <header className="lp-hero" ref={heroRef} id="top">
        <div className="lp-hero-copy">
          <p className="lp-hero-badge">LOG INTELLIGENCE PLATFORM</p>
          <h1>
            Your logs,
            <br />
            <span className="lp-gradient">clearly explained.</span>
          </h1>
          <p className="lp-hero-sub">
            Relog detects failures in your application logs, adds context around
            every error, and uses AI to tell you what broke — and what to do next.
          </p>
          <div className="lp-hero-cta">
            <Link to="/app" className="lp-btn-primary lg">
              Open dashboard →
            </Link>
            <button type="button" className="lp-btn-outline" onClick={() => scrollTo("how")}>
              See how it works
            </button>
          </div>
          <div className="lp-hero-stats">
            <div>
              <strong>Fast</strong>
              <span>Rule-based + AI pipeline</span>
            </div>
            <div>
              <strong>Secure</strong>
              <span>OAuth & API keys</span>
            </div>
            <div>
              <strong>Live</strong>
              <span>SSE real-time feed</span>
            </div>
          </div>
        </div>

        <div className="lp-terminal">
          <div className="lp-term-bar">
            <span />
            <span />
            <span />
            <em>app.log — live analysis</em>
          </div>
          <div className="lp-term-body">
            <p className="lp-term-line dim">2026-09-05 15:40:02 INFO Starting database pool</p>
            <p className="lp-term-line err">2026-09-05 15:40:02 ERROR Connection refused on 5432</p>
            <p className="lp-term-line dim">Traceback (most recent call last):</p>
            <p className="lp-term-line dim">  File "app/db.py", line 42, in connect</p>
            <p className="lp-term-line err">psycopg2.OperationalError: could not connect</p>
            <div className="lp-term-result">
              <span className="lp-ai-tag">AI EXPLANATION</span>
              <p>
                <b>Meaning:</b> PostgreSQL is unreachable on port 5432.
              </p>
              <p>
                <b>Next step:</b> Verify the database service is running and
                connection credentials are correct.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="lp-section" id="features">
        <p className="lp-eyebrow">FEATURES</p>
        <h2>Everything you need to decode production logs</h2>
        <div className="lp-features">
          {FEATURES.map((f) => (
            <article className="lp-feature-card" key={f.title}>
              <span className="lp-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-how" id="how">
        <p className="lp-eyebrow">HOW IT WORKS</p>
        <h2>From raw logs to actionable insight in three steps</h2>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <article className="lp-step" key={s.n}>
              <span className="lp-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
        <pre className="lp-agent-cmd">
          <span>$</span> relog-agent --log ./logs/app.log --api-key relog_••••••
        </pre>
      </section>

      <section className="lp-section lp-about" id="about">
        <p className="lp-eyebrow">WHAT IS RELOG</p>
        <h2>Built for developers who ship fast and debug faster</h2>
        <div className="lp-about-grid">
          <div className="lp-about-block">
            <h3>The problem</h3>
            <p>
              Production logs are noisy. When something breaks at 2 AM, scrolling
              through thousands of lines to find the root cause wastes precious
              time.
            </p>
          </div>
          <div className="lp-about-block">
            <h3>The solution</h3>
            <p>
              Relog combines fast rule-based error detection with optional Groq AI
              to surface only what matters — with human-readable explanations
              attached to every finding.
            </p>
          </div>
          <div className="lp-about-block">
            <h3>Your workflow</h3>
            <p>
              Use the web dashboard for one-off analysis, or deploy the agent for
              continuous monitoring. All reports sync to your account history.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2>Ready to understand your logs?</h2>
          <p>Sign in and start analyzing in under a minute.</p>
          <div className="lp-hero-cta">
            <Link to="/login" className="lp-btn-primary lg">
              Sign in & analyze →
            </Link>
            <Link to="/app" className="lp-btn-outline">
              Explore dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-col">
            <a href="#" className="lp-logo" onClick={(e) => e.preventDefault()}>
              <b>R</b> relog
            </a>
            <p>Log intelligence for modern teams.</p>
          </div>
          <div className="lp-footer-col">
            <b>Product</b>
            <button type="button" onClick={() => scrollTo("features")}>
              Features
            </button>
            <button type="button" onClick={() => scrollTo("how")}>
              How it works
            </button>
            <Link to="/app">Dashboard</Link>
          </div>
          <div className="lp-footer-col">
            <b>Account</b>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Get started</Link>
          </div>
          <div className="lp-footer-col">
            <b>Resources</b>
            <a
              href="https://relog.fastapicloud.dev/docs"
              target="_blank"
              rel="noreferrer"
            >
              API docs
            </a>
            <a href="https://relog.fastapicloud.dev/health" target="_blank" rel="noreferrer">
              Status
            </a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} Relog. All rights reserved.</span>
          <span>Fast rules. Focused AI.</span>
        </div>
      </footer>
    </div>
  );
}
