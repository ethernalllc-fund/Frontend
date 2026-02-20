import { useEffect } from 'react';
import { Shield, GraduationCap, TrendingUp } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useWallet } from '@/hooks/web3/useWallet';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/common/SEO';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, disconnect, openModal } = useWallet();
  const { t } = useTranslation();

  useEffect(() => {
    if (sessionStorage.getItem('autoDisconnectHome') === 'true' && isConnected) {
      disconnect();
      sessionStorage.removeItem('autoDisconnectHome');
    }
  }, [isConnected, disconnect]);

  const handleGetStarted = () => {
    if (isConnected) {
      void navigate('/calculator');
    } else {
      openModal();
    }
  };

  return (
    <>
      <SEO
        title={t('hero.title')}
        description={t('hero.subtitle')}
        keywords={['retirement', 'blockchain', 'DeFi', 'Arbitrum', 'decentralized', 'savings']}
      />

      <div className="pt-4">

        {/* ── Hero ── */}
        <section className="bg-linear-to-b from-gray-800 to-green-800 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">{t('hero.title')}</h1>
            <p className="text-xl mb-8 text-gray-200">{t('hero.subtitle')}</p>
            <button
              onClick={handleGetStarted}
              className="bg-yellow-600 hover:bg-yellow-700 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition flex items-center gap-2 mx-auto shadow-lg"
            >
              {isConnected ? t('hero.ctaConnected') : t('hero.ctaDisconnected')}
            </button>
          </div>
        </section>

        {/* ── Survey Banner ── */}
        <section className="py-10 px-4 bg-linear-to-br from-blue-50 to-green-50">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-700 text-lg mb-4">
              🙌 {t('survey.bannerText')}
            </p>
            <Link
              to="/survey"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition shadow-md"
            >
              {t('survey.bannerCta')}
            </Link>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
              {t('features.title')}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {(
                [
                  { icon: Shield,        key: 'security'  },
                  { icon: GraduationCap, key: 'education' },
                  { icon: TrendingUp,    key: 'fees'      },
                ] as const
              ).map(({ icon: Icon, key }) => (
                <div key={key} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition">
                  <Icon className="text-green-600 mb-4" size={40} />
                  <h3 className="text-xl font-semibold mb-3 text-gray-800">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="text-gray-600">{t(`features.${key}.description`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── About ── */}
        <section className="bg-gray-100 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-gray-800">{t('about.title')}</h2>
            <p className="text-lg text-gray-700 leading-relaxed">{t('about.description')}</p>
          </div>
        </section>

      </div>
    </>
  );
};

export default HomePage;