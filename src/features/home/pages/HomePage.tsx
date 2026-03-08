import React from 'react';
import styles from './HomePage.module.css';
// import WaterParallax from './Waterparallax';
import GravityScene from './Gravityscene';

const features = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    title: 'Identity Graph',
    description:
      'Build a unified view of your digital presence across platforms. Map who you are, how you engage, and what makes you distinctly you in the digital world.',
    accent: 'teal',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="12" width="4" height="9" />
        <rect x="10" y="7" width="4" height="14" />
        <rect x="17" y="3" width="4" height="18" />
      </svg>
    ),
    title: 'Behavioral Analytics',
    description:
      'Uncover patterns in your behavior, preferences, and habits. Our AI engine surfaces hidden insights that help you understand your own decisions at a deeper level.',
    accent: 'emerald',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      </svg>
    ),
    title: 'Cognitive Observability',
    description:
      'Monitor your thought patterns, communication style, and cognitive tendencies. Gain a real-time window into how you think, adapt, and respond to the world.',
    accent: 'teal',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Privacy Shield',
    description:
      'Your data never leaves your control. End-to-end encryption, zero-knowledge architecture, and granular permission controls keep your digital self truly yours.',
    accent: 'gold',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Realtime Signals',
    description:
      'Live telemetry from your digital footprint — sentiment shifts, engagement trends, and activity rhythms — all visualized in a single intelligent dashboard.',
    accent: 'emerald',
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: 'Cross-Platform Sync',
    description:
      'Seamlessly integrate data from 50+ platforms — social networks, productivity tools, health apps, and more. One coherent picture from many scattered sources.',
    accent: 'gold',
  },
];

const steps = [
  {
    number: '01',
    title: 'Connect Sources',
    desc: 'Link your accounts and data sources securely in minutes.',
  },
  {
    number: '02',
    title: 'AI Analysis',
    desc: 'Our engine processes and patterns your personal data automatically.',
  },
  {
    number: '03',
    title: 'Gain Insights',
    desc: 'Explore your cognitive profile through an intuitive dashboard.',
  },
  {
    number: '04',
    title: 'Take Action',
    desc: 'Use insights to improve decisions, habits, and digital presence.',
  },
];

const accentClass: Record<string, string> = {
  teal: styles.cardTeal,
  emerald: styles.cardEmerald,
  gold: styles.cardGold,
};

const HomePage: React.FC = () => {
  return (
    <div className={styles.homePage}>
      <GravityScene />
      {/* Full-screen animated background */}
      <div className={styles.homeBg}>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
      </div>

      {/* ── HERO ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroBadge}>
          <span className={styles.badgeDot} />
          NOW IN OPEN BETA
        </div>

        <h1 className={styles.heroTitle}>
          Know Your <span className={styles.accent}>Digital Self</span>
          <br />
          Like Never Before
        </h1>

        <p className={styles.heroSubtitle}>
          Personal Data Platform gives you full cognitive observability of your
          digital identity — unifying behavioral data, AI-driven insights, and
          privacy-first architecture in one place.
        </p>

        <p className={styles.heroDescription}>
          Built for individuals who believe their data should work for them, not
          against them.
        </p>

        <div className={styles.heroActions}>
          <button
            className={styles.ctaButton}
            style={{ padding: '0.9rem 2.8rem', fontSize: '0.88rem' }}
          >
            GET STARTED FREE
          </button>
          <a href="/demo" className={styles.ctaSecondaryBtn}>
            Watch Demo →
          </a>
        </div>

        <div className={styles.heroStatRow}>
          <div className={styles.heroStat}>
            <span className={styles.statNumber}>12K+</span>
            <span className={styles.statLabel}>Active Users</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.heroStat}>
            <span className={styles.statNumber}>50+</span>
            <span className={styles.statLabel}>Integrations</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.heroStat}>
            <span className={styles.statNumber}>99.9%</span>
            <span className={styles.statLabel}>Uptime SLA</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.heroStat}>
            <span className={styles.statNumber}>0</span>
            <span className={styles.statLabel}>Data Sold</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className={styles.featuresSection}>
        <p className={styles.sectionLabel}>Core Capabilities</p>
        <h2 className={styles.sectionTitle}>
          Everything You Need to Understand Yourself
        </h2>
        <p className={styles.sectionSubtitle}>
          Six powerful modules working together to give you the clearest picture
          of your digital identity, behavioral patterns, and cognitive
          footprint.
        </p>

        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`${styles.featureCard} ${accentClass[feature.accent]}`}
            >
              <div className={styles.cardIcon}>{feature.icon}</div>
              <div className={styles.cardText}>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.cardDesc}>{feature.description}</p>
                <span className={styles.cardLink}>
                  Learn more
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
              <div className={styles.cardGlow} />
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howSection}>
        <p className={styles.sectionLabel}>How It Works</p>
        <h2 className={styles.sectionTitle}>
          From Data to Self-Awareness in Four Steps
        </h2>
        <p className={styles.sectionSubtitle}>
          Simple onboarding, powerful results. Be up and running in under 10
          minutes.
        </p>

        <div className={styles.stepsRow}>
          {steps.map((step) => (
            <div className={styles.stepItem} key={step.number}>
              <div className={styles.stepNumber}>{step.number}</div>
              <h4 className={styles.stepTitle}>{step.title}</h4>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section className={styles.quoteSection}>
        <div className={styles.quoteCard}>
          <span className={styles.quoteIcon}>"</span>
          <p className={styles.quoteText}>
            PDP transformed the way I understand my own patterns. I had no idea
            how scattered my digital life was until I saw it all unified. It's
            like having a mirror for your mind.
          </p>
          <div className={styles.quoteAuthor}>
            <div className={styles.authorAvatar}>SR</div>
            <div className={styles.authorInfo}>
              <p className={styles.authorName}>Sara R.</p>
              <p className={styles.authorRole}>
                Product Manager, Early Adopter
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready to Meet Your Digital Self?</h2>
          <p className={styles.ctaText}>
            Join thousands of individuals reclaiming ownership of their personal
            data. Start free, no credit card required. Book a personalized
            walkthrough with our team.
          </p>
          <div className={styles.ctaButtons}>
            <button className={styles.ctaButton}>BOOK A CALL</button>
            <a href="/signup" className={styles.ctaSecondaryBtn}>
              Start Free →
            </a>
          </div>
          <p className={styles.ctaNote}>
            Free forever plan available · GDPR compliant · SOC 2 certified
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
