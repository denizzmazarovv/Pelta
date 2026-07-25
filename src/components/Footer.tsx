import { useLang } from "../context/LangContext";
import {
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
} from "lucide-react";
import { FaInstagram, FaTelegramPlane } from "react-icons/fa";

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-wine-500 border-t border-cream/10 text-cream/80">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        {/* Верхняя часть */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Колонка 1: Логотип + Каталог */}
          <div>
            {/* Логотип */}
            <div className="flex items-center gap-2 mb-8">
              <span className="font-serif text-3xl font-semibold text-cream">
                Pelta
              </span>
              <span className="font-serif text-3xl font-light italic text-cream/80">
                Nera
              </span>
            </div>

            {/* Каталог */}
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-cream mb-5">
                {t("nav.catalog")}
              </h3>

              <ul className="space-y-3">
                <li>
                  <a
                    href="#catalog"
                    className="text-cream/60 hover:text-cream transition-colors"
                  >
                    {t("cat.cardholder")}
                  </a>
                </li>

                <li>
                  <a
                    href="#catalog"
                    className="text-cream/60 hover:text-cream transition-colors"
                  >
                    {t("cat.bag")}
                  </a>
                </li>

                <li>
                  <a
                    href="#catalog"
                    className="text-cream/60 hover:text-cream transition-colors"
                  >
                    {t("cat.belt")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Колонка 2: Контакты */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.25em] text-cream mb-5">
              {t("nav.contact")}
            </h3>

            <ul className="space-y-4 text-sm">
              <li>
                <a
                  href="tel:+998909391216"
                  className="flex items-center gap-3 text-cream/60 hover:text-cream transition-colors"
                >
                  <Phone size={16} />
                  +998 90 939 12 16
                </a>
              </li>

              <li>
                <a
                  href="mailto:peltanera@gmail.com"
                  className="flex items-center gap-3 text-cream/60 hover:text-cream transition-colors"
                >
                  <Mail size={16} />
                  peltanera@gmail.com
                </a>
              </li>

              <li>
                <a
                  href="https://t.me/peltanera"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-cream/60 hover:text-cream transition-colors"
                >
                  <FaTelegramPlane size={16} />
                  Telegram
                </a>
              </li>

              <li>
                <a
                  href="https://instagram.com/peltanera"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-cream/60 hover:text-cream transition-colors"
                >
                  <FaInstagram size={16} />
                  Instagram
                </a>
              </li>

              <li>
                <a
                  href="https://maps.google.com/?q=Tashkent,+Amir+Temur+St."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-cream/60 hover:text-cream transition-colors"
                >
                  <MapPin size={16} />
                  Tashkent, Uzbekistan
                </a>
              </li>
            </ul>
          </div>

          {/* Колонка 3: О бренде (Founder + информация) */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.25em] text-cream mb-5">
              {t("nav.about") || "About Brand"}
            </h3>

            <div className="space-y-5">
              <div className="flex gap-3">
                <User size={16} className="mt-1 shrink-0 text-cream/60" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-cream/40">
                    Founder
                  </p>
                  <p className="text-cream">Deniz Oztyurk</p>
                </div>
              </div>

              <div className="flex gap-3">
                <FileText size={16} className="mt-1 shrink-0 text-cream/60" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-cream/40">
                    Registration
                  </p>
                  <p>No. 000000000</p>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin size={16} className="mt-1 shrink-0 text-cream/60" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-cream/40">
                    Based in
                  </p>
                  <p>Tashkent, Uzbekistan</p>
                </div>
              </div>

              <div className="pt-3 border-t border-cream/10">
                <p className="text-sm text-cream/60 italic">
                  {t("footer.tagline") || "Luxury leather accessories crafted with passion"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Нижняя часть */}
        <div className="mt-16 pt-8 border-t border-cream/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-cream/50">
            © {year} Pelta Nera. {t("footer.rights")}.
          </p>

          <p className="font-serif italic text-cream/60">
            Pelta Nera — {t("footer.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}