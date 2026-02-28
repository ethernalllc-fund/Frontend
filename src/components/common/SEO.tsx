interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string[];
}

export const SEO = ({ 
  title, 
  description, 
  image = '/og-image.png',
  url,
  type = 'website',
  keywords = [],
}: SEOProps) => {
  const fullTitle = `${title} | Ethernal | Eternal `;
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Ethernity DAO" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Ethernity DAO" />

      {/* Canonical URL */}
      {currentUrl && <link rel="canonical" href={currentUrl} />}
    </>
  );
};

export default SEO;