import { useState, useEffect, useRef } from "react";
// navbar removed — handled by parent layout

const UNSPLASH_IMGS = {
  hero: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80",
  ruins: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
  youth: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80",
  mountains: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
  city: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80",
  people: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&q=80",
};

function useIntersection(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function FadeIn({ children, delay = 0, className = "" }) {
  const [ref, visible] = useIntersection();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 1s ease ${delay}s, transform 1s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ number, label, delay }) {
  return (
    <FadeIn delay={delay} className="flex flex-col items-center">
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(2.5rem, 5vw, 4rem)",
          fontWeight: 300,
          color: "#C9A96E",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {number}
      </span>
      <span
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
          marginTop: "0.5rem",
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </FadeIn>
  );
}

function ParallaxImage({ src, alt, children, height = "100vh", overlay = "rgba(0,0,0,0.55)" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const pct = -rect.top / window.innerHeight;
      el.querySelector(".parallax-bg").style.transform = `translateY(${pct * 30}%)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", height, overflow: "hidden" }}>
      <div
        className="parallax-bg"
        style={{
          position: "absolute", inset: "-15% 0",
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "transform 0.1s linear",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: overlay }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

export default function KosovoPage() {
  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: "#0A0A0B", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(201,169,110,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0B; }
        ::-webkit-scrollbar-thumb { background: #C9A96E; border-radius: 2px; }

        .gold { color: #C9A96E; }
        .glass {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .timeline-line {
          position: absolute; left: 50%; top: 0; bottom: 0;
          width: 1px; background: linear-gradient(to bottom, transparent, #C9A96E 20%, #C9A96E 80%, transparent);
          transform: translateX(-50%);
        }
        .pillar-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 2px;
          padding: 2.5rem 2rem;
          transition: border-color 0.4s, background 0.4s;
        }
        .pillar-card:hover {
          border-color: rgba(201,169,110,0.4);
          background: rgba(201,169,110,0.05);
        }
        .chapter-label {
          font-size: 0.65rem; letter-spacing: 0.35em;
          text-transform: uppercase; color: #C9A96E;
          margin-bottom: 1.2rem; display: block;
        }
        .serif {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .hero-sub { animation: fadeUp 1.4s ease 1.2s both; }
        .hero-cta { animation: fadeUp 1.4s ease 1.6s both; }
        .scroll-hint { animation: shimmer 2.5s ease infinite; }
        .eu-star { display: inline-block; color: #FFD700; margin: 0 2px; font-size: 0.7rem; }
      `}</style>

      {/* HERO */}
      <section id="story" style={{ position: "relative", height: "100vh", minHeight: 600, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1800&q=80)`,
          backgroundSize: "cover", backgroundPosition: "center 30%",
        }} />
        {/* Cinematic gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.6) 50%, rgba(10,10,11,0.3) 100%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
          background: "linear-gradient(to top, #0A0A0B, transparent)",
        }} />
        <div style={{
          position: "relative", zIndex: 2,
          height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "0 6rem",
          maxWidth: 900,
        }}>
          <span className="chapter-label" style={{ animation: "fadeDown 1s ease 0.3s both" }}>
            ✦ &nbsp; A Story of Survival and Becoming
          </span>
          <h1 className="serif" style={{
            fontSize: "clamp(3.5rem, 8vw, 7rem)",
            lineHeight: 1.05, fontWeight: 300,
            margin: 0, letterSpacing: "-0.02em",
            animation: "fadeUp 1.4s ease 0.6s both",
          }}>
            Kosovo.<br /><em style={{ color: "#C9A96E" }}>Europe's</em><br />Young Heart.
          </h1>
          <p className="hero-sub" style={{
            maxWidth: 480, marginTop: "2rem",
            fontSize: "1rem", fontWeight: 300,
            lineHeight: 1.8, color: "rgba(255,255,255,0.65)",
          }}>
            From the ashes of war to the dawn of a new chapter —
            a nation of two million souls reaching toward a shared European future.
          </p>
          <div className="hero-cta" style={{ marginTop: "2.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <a href="#people" style={{
              padding: "0.9rem 2.2rem",
              background: "#C9A96E", color: "#0A0A0B",
              fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase",
              fontWeight: 600, textDecoration: "none",
              transition: "opacity 0.3s",
            }}
              onMouseEnter={e => e.target.style.opacity = 0.85}
              onMouseLeave={e => e.target.style.opacity = 1}
            >
              Discover Kosovo
            </a>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)" }}>
              Scroll to explore ↓
            </span>
          </div>
        </div>

        {/* EU stars decoration */}
        <div style={{ position: "absolute", bottom: "8%", right: "6%", zIndex: 2, textAlign: "right" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            {[...Array(12)].map((_, i) => <span key={i} className="eu-star">★</span>)}
          </div>
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
            Candidate for the European Future
          </span>
        </div>
      </section>

      {/* WOUND + RESILIENCE — split cinematic */}
      <section style={{ padding: "8rem 0", background: "#0A0A0B" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 4rem" }}>
          <FadeIn>
            <span className="chapter-label">I. The Weight of History</span>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>
            <FadeIn delay={0.1}>
              <div>
                <h2 className="serif" style={{
                  fontSize: "clamp(2.5rem, 4vw, 3.8rem)",
                  fontWeight: 300, lineHeight: 1.15,
                  color: "#fff", margin: "0 0 2rem",
                }}>
                  A people<br />who refused<br /><em style={{ color: "#C9A96E" }}>to disappear.</em>
                </h2>
                <p style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.9, fontSize: "0.95rem", maxWidth: 440 }}>
                  In 1999, Kosovo endured one of Europe's darkest chapters — displacement,
                  destruction, and the erasure of a way of life. Over 1.3 million people
                  were forced from their homes. Cities reduced to rubble.
                </p>
                <p style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.9, fontSize: "0.95rem", maxWidth: 440, marginTop: "1.2rem" }}>
                  Yet from that silence, Kosovo rose. Not slowly — but with the
                  urgency of a people who had everything to rebuild.
                </p>
                <div style={{
                  marginTop: "2.5rem", paddingLeft: "1.5rem",
                  borderLeft: "2px solid #C9A96E",
                }}>
                  <p className="serif" style={{ fontSize: "1.4rem", fontStyle: "italic", color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.6 }}>
                    "Memory does not trap us — it teaches us the value of peace."
                  </p>
                  <span style={{ fontSize: "0.7rem", letterSpacing: "0.15em", color: "#C9A96E", marginTop: "0.8rem", display: "block" }}>
                    — A SURVIVOR OF PRISTINA, 1999
                  </span>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", top: -20, left: -20, right: 40, bottom: 40,
                  border: "1px solid rgba(201,169,110,0.2)",
                  borderRadius: 2,
                  zIndex: 0,
                }} />
                <div style={{
                  position: "relative", zIndex: 1,
                  aspectRatio: "4/5",
                  backgroundImage: `url(https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80)`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  borderRadius: 2,
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,11,0.7) 0%, transparent 50%)" }} />
                  <div style={{ position: "absolute", bottom: "1.5rem", left: "1.5rem", right: "1.5rem" }}>
                    <div style={{ display: "flex", gap: "2rem" }}>
                      {[["1.3M", "Displaced"], ["13,500+", "Lives Lost"], ["25", "Years of Rebuilding"]].map(([n, l]) => (
                        <div key={l}>
                          <div className="gold serif" style={{ fontSize: "1.6rem", fontWeight: 300 }}>{n}</div>
                          <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* REBUILD TIMELINE */}
      <section style={{ padding: "8rem 0", background: "#0D0D0F" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 4rem", textAlign: "center" }}>
          <FadeIn>
            <span className="chapter-label">II. The Rebuilding</span>
            <h2 className="serif" style={{ fontSize: "clamp(2.2rem, 4vw, 3.4rem)", fontWeight: 300, margin: "0 0 5rem" }}>
              From ruins, a <em style={{ color: "#C9A96E" }}>nation was built</em>.
            </h2>
          </FadeIn>

          <div style={{ position: "relative" }}>
            <div className="timeline-line" />
            {[
              { year: "1999", text: "Liberation and the beginning of international support. NATO intervention ends the conflict." },
              { year: "2000", text: "UN administration begins. Water, electricity, and hospitals are rebuilt from scratch." },
              { year: "2008", text: "Kosovo declares independence. A new constitution. A new flag. A new dream." },
              { year: "2015", text: "Kosovo becomes a member of UEFA and FIFA. Sports as a symbol of recognition." },
              { year: "2024", text: "Visa liberalization with the EU. For the first time, Kosovars travel freely across Europe." },
            ].map((item, i) => (
              <FadeIn key={item.year} delay={i * 0.1}>
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: i % 2 === 0 ? "flex-end" : "flex-start",
                  marginBottom: "3.5rem", position: "relative",
                }}>
                  <div style={{
                    width: "44%",
                    textAlign: i % 2 === 0 ? "right" : "left",
                    ...(i % 2 !== 0 ? { marginLeft: "56%" } : {}),
                  }}>
                    <span className="gold serif" style={{ fontSize: "2rem", fontWeight: 300, display: "block", lineHeight: 1 }}>{item.year}</span>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", lineHeight: 1.7, marginTop: "0.4rem" }}>{item.text}</p>
                  </div>
                  {/* dot */}
                  <div style={{
                    position: "absolute", left: "50%", top: "0.4rem",
                    width: 10, height: 10,
                    background: "#C9A96E", borderRadius: "50%",
                    transform: "translateX(-50%)",
                    boxShadow: "0 0 0 4px rgba(201,169,110,0.15)",
                  }} />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PEOPLE SECTION */}
      <section id="people" style={{ position: "relative", height: "90vh", minHeight: 500, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1800&q=80)`,
          backgroundSize: "cover", backgroundPosition: "center 25%",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(10,10,11,0.85) 0%, rgba(10,10,11,0.4) 60%, rgba(10,10,11,0.7) 100%)",
        }} />
        <div style={{
          position: "relative", zIndex: 2,
          height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "flex-end", padding: "0 6rem 6rem",
        }}>
          <FadeIn>
            <span className="chapter-label">III. The People</span>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h2 className="serif" style={{
              fontSize: "clamp(3rem, 6vw, 5.5rem)",
              fontWeight: 300, lineHeight: 1.1,
              maxWidth: 700, margin: "0 0 2rem",
            }}>
              The youngest nation<br />in <em style={{ color: "#C9A96E" }}>Europe</em> —<br />and its most hopeful.
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p style={{ maxWidth: 500, color: "rgba(255,255,255,0.6)", lineHeight: 1.85, fontSize: "1rem" }}>
              Over 50% of Kosovo's population is under 30. A generation that never
              accepted limits. Educated, ambitious, multilingual — they carry Europe
              already in their hearts.
            </p>
          </FadeIn>

          {/* Stat row */}
          <div style={{ display: "flex", gap: "4rem", marginTop: "3rem" }}>
            <StatCard number="1.8M" label="Population" delay={0.3} />
            <StatCard number="50%" label="Under Age 30" delay={0.4} />
            <StatCard number="92%" label="Pro-EU in polls" delay={0.5} />
            <StatCard number="4" label="Languages Spoken" delay={0.6} />
          </div>
        </div>
      </section>

      {/* PILLARS — European Values */}
      <section id="vision" style={{ padding: "8rem 0", background: "#0A0A0B" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 4rem" }}>
          <FadeIn>
            <span className="chapter-label">IV. Why Europe</span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="serif" style={{ fontSize: "clamp(2.2rem, 4vw, 3.4rem)", fontWeight: 300, maxWidth: 600, marginBottom: "4rem" }}>
              Kosovo doesn't just want to <em style={{ color: "#C9A96E" }}>join</em> Europe.<br />
              It already <em style={{ color: "#C9A96E" }}>lives</em> its values.
            </h2>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {[
              {
                icon: "⚖",
                title: "Rule of Law",
                text: "A young constitutional democracy with an active civil society pushing for transparency, justice, and accountability.",
              },
              {
                icon: "🤝",
                title: "Hospitality Without Borders",
                text: "In Kosovo, strangers become guests within minutes. Hospitality is not a tradition — it is a way of being.",
              },
              {
                icon: "🌿",
                title: "Untouched Nature",
                text: "The Albanian Alps, Rugova Canyon, and medieval monasteries coexist in a landscape still free from mass tourism.",
              },
              {
                icon: "🎓",
                title: "Education & Ambition",
                text: "Thousands of Kosovar students study across Europe. They return with skills, languages, and a vision for their country.",
              },
              {
                icon: "🎨",
                title: "Culture in Bloom",
                text: "From Pristina's vibrant art scene to centuries-old crafts — Kosovo's identity is both ancient and radically contemporary.",
              },
              {
                icon: "✊",
                title: "Resilience as Character",
                text: "A people who rebuilt an entire country in a generation know something about determination that textbooks cannot teach.",
              },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08}>
                <div className="pillar-card">
                  <div style={{ fontSize: "1.8rem", marginBottom: "1.2rem" }}>{p.icon}</div>
                  <h3 style={{ fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#C9A96E", marginBottom: "0.8rem", fontWeight: 500 }}>
                    {p.title}
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>{p.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* NATURE BAND */}
      <section style={{ position: "relative", height: "70vh", minHeight: 400, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1800&q=80)`,
          backgroundSize: "cover", backgroundPosition: "center 40%",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, #0A0A0B 0%, transparent 25%, transparent 70%, #0A0A0B 100%)",
        }} />
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FadeIn>
            <div style={{ textAlign: "center" }}>
              <span className="chapter-label">V. The Land</span>
              <p className="serif" style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                fontWeight: 300, lineHeight: 1.4,
                maxWidth: 600, margin: "0 auto",
                color: "rgba(255,255,255,0.9)",
              }}>
                "Between these mountains,<br />every stone holds a story —<br />
                <em style={{ color: "#C9A96E" }}>and every sunrise, a promise.</em>"
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* EU INTEGRATION CALL */}
      <section id="europe" style={{ padding: "9rem 0", background: "#0D0D0F" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 4rem", textAlign: "center" }}>
          <FadeIn>
            <div style={{ marginBottom: "2rem" }}>
              {[...Array(12)].map((_, i) => (
                <span key={i} style={{ color: "#FFD700", fontSize: "1rem", margin: "0 3px" }}>★</span>
              ))}
            </div>
            <span className="chapter-label" style={{ justifyContent: "center", display: "block" }}>VI. The European Future</span>
            <h2 className="serif" style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              fontWeight: 300, lineHeight: 1.15,
              margin: "0 0 2rem",
            }}>
              Kosovo's path to Europe<br />is not a <em style={{ color: "#C9A96E" }}>request</em>.<br />
              It is a <em style={{ color: "#C9A96E" }}>homecoming</em>.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.9, fontSize: "1rem", maxWidth: 580, margin: "0 auto 3rem" }}>
              Geographically, culturally, and in spirit — Kosovo has always been
              part of the European story. EU membership is not the goal of politicians.
              It is the dream of two million people who earned it through extraordinary sacrifice.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.5px", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.06)", marginBottom: "4rem",
            }}>
              {[
                ["2008", "Independence Declared"],
                ["2016", "SAA with EU Signed"],
                ["2024", "Visa-Free Travel Begins"],
              ].map(([y, t]) => (
                <div key={y} style={{ padding: "2rem", background: "#0D0D0F", textAlign: "center" }}>
                  <div className="gold serif" style={{ fontSize: "2.2rem", fontWeight: 300 }}>{y}</div>
                  <div style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>{t}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="glass" style={{ borderRadius: 2, padding: "3rem 3.5rem" }}>
              <p className="serif" style={{ fontSize: "1.5rem", fontStyle: "italic", lineHeight: 1.7, color: "rgba(255,255,255,0.85)", margin: "0 0 1.5rem" }}>
                "A Europe that forgets Kosovo forgets a part of itself."
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
                <div style={{ width: 40, height: 1, background: "#C9A96E" }} />
                <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A96E" }}>Kosovo · Two Million Voices</span>
                <div style={{ width: 40, height: 1, background: "#C9A96E" }} />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ position: "relative", height: "80vh", minHeight: 450, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1800&q=80)`,
          backgroundSize: "cover", backgroundPosition: "center",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(10,10,11,0.9) 0%, rgba(10,10,11,0.5) 100%)",
        }} />
        <div style={{
          position: "relative", zIndex: 2,
          height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "0 6rem",
        }}>
          <FadeIn>
            <span className="chapter-label">Come, See, Understand</span>
            <h2 className="serif" style={{
              fontSize: "clamp(2.8rem, 6vw, 5rem)",
              fontWeight: 300, lineHeight: 1.1,
              maxWidth: 650, margin: "0 0 2rem",
            }}>
              Kosovo is not just a country<br />waiting to be <em style={{ color: "#C9A96E" }}>discovered</em>.<br />
              It is a story waiting<br />to be <em style={{ color: "#C9A96E" }}>witnessed</em>.
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <a href="#story" style={{
              display: "inline-block",
              padding: "1rem 2.8rem",
              background: "transparent",
              color: "#C9A96E",
              border: "1px solid #C9A96E",
              fontSize: "0.7rem", letterSpacing: "0.25em",
              textTransform: "uppercase", fontWeight: 500,
              textDecoration: "none",
              transition: "all 0.4s",
            }}
              onMouseEnter={e => { e.target.style.background = "#C9A96E"; e.target.style.color = "#0A0A0B"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#C9A96E"; }}
            >
              Begin the Journey
            </a>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: "3rem 6rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#0A0A0B",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 24, height: 24, background: "#C9A96E", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.55rem", color: "#0A0A0B", fontWeight: 600 }}>KS</span>
          </div>
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Kosovo · European Integration</span>
        </div>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)" }}>
          {[...Array(12)].map((_, i) => <span key={i} style={{ color: "rgba(255,215,0,0.3)", margin: "0 2px" }}>★</span>)}
        </div>
        <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)" }}>
          A NATION. A FUTURE. EUROPE.
        </span>
      </footer>
    </div>
  );
}