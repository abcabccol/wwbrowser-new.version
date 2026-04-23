import { Globe, BrainCircuit, ShieldCheck, Rocket, Mail } from "lucide-react";

const features = [
  {
    title: "Akilli Arama",
    description:
      "Kullanici niyetine gore hizli sonuclar ve net ozetler sunan sade arama deneyimi.",
    icon: BrainCircuit,
  },
  {
    title: "Guvenli Altyapi",
    description:
      "Temiz kod yapisi, modern toolchain ve performans odakli kurulum ile guvenilir teslimat.",
    icon: ShieldCheck,
  },
  {
    title: "Hizli Yayin",
    description:
      "Vite tabanli yapiyla gelistirme hizli, build sureci kisa ve deployment kolay.",
    icon: Rocket,
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a className="text-xl font-bold tracking-tight" href="/">
            WW Browser
          </a>
          <nav className="hidden gap-6 text-sm text-text-muted md:flex">
            <a href="#ozellikler" className="hover:text-white">
              Ozellikler
            </a>
            <a href="#hakkinda" className="hover:text-white">
              Hakkinda
            </a>
            <a href="#iletisim" className="hover:text-white">
              Iletisim
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-mid px-3 py-1 text-xs text-accent-blue">
              <Globe size={14} />
              Modern web deneyimi
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Prototipi calisan bir web sitesine donusturduk.
            </h1>
            <p className="mt-5 max-w-xl text-text-muted">
              Bu sayfa artik dogrudan tanitim ve urun sunumu icin hazir. Net
              bolumler, temiz tipografi ve responsive yapiyla her cihazda
              duzgun gorunur.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#ozellikler"
                className="rounded-lg bg-accent-blue px-5 py-3 text-sm font-semibold text-black hover:brightness-110"
              >
                Ozellikleri Gor
              </a>
              <a
                href="#iletisim"
                className="rounded-lg border border-border-mid px-5 py-3 text-sm font-semibold text-white hover:bg-surface-high"
              >
                Iletisime Gec
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border-mid bg-surface-mid p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-blue">
              Hemen kullan
            </p>
            <h2 className="mt-3 text-2xl font-semibold">Tek sayfa, net mesaj</h2>
            <p className="mt-3 text-sm text-text-muted">
              Site yapisi: Hero + Ozellikler + Hakkinda + Iletisim. Istersen bir
              sonraki adimda fiyatlandirma, SSS veya blog bolumleri de
              ekleyebilirim.
            </p>
          </div>
        </section>

        <section id="ozellikler" className="border-y border-border-dark bg-surface-low">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold">Ozellikler</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-xl border border-border-mid bg-surface-mid p-5"
                >
                  <feature.icon className="text-accent-blue" size={22} />
                  <h3 className="mt-3 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-text-muted">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="hakkinda" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold">Hakkinda</h2>
          <p className="mt-4 max-w-3xl text-text-muted">
            Bu proje, onceki uygulama prototipinden sade ve yayina hazir bir
            web sitesine gecis icin duzenlendi. Kod tabani artik daha kolay
            genisletilebilir durumda.
          </p>
        </section>
      </main>

      <footer id="iletisim" className="border-t border-border-dark bg-surface-low">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-text-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 WW Browser. Tum haklari saklidir.</p>
          <a href="mailto:hello@wwbrowser.local" className="inline-flex items-center gap-2 hover:text-white">
            <Mail size={14} />
            hello@wwbrowser.local
          </a>
        </div>
      </footer>
    </div>
  );
}


