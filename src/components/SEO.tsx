import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const defaultSEO = {
  title: 'Archer Aqua | AI-Powered Water Tracking & Hydration App',
  description: 'AI-powered hydration app by Antonio Archer. Track your daily water intake, unlock achievements, monitor weather-based hydration needs, and stay healthy with intelligent insights.',
  keywords: 'Antonio Archer, Archer Aqua, Water Tracker, Hydration App, Daily Water Intake, Fitness Tracker, Health App, Philadelphia, Software Developer, DevOps Engineer, Hydration Monitoring, Water Tracking App, Wellness App',
  image: 'https://aqua.adarcher.app/favicon.ico',
  url: 'https://aqua.adarcher.app',
  type: 'website',
  author: 'Antonio Archer',
};

export function SEO({
  title = defaultSEO.title,
  description = defaultSEO.description,
  keywords = defaultSEO.keywords,
  image = defaultSEO.image,
  url = defaultSEO.url,
  type = defaultSEO.type,
  author = defaultSEO.author,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const fullTitle = title === defaultSEO.title ? title : `${title} | Archer Aqua`;
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:site_name" content="Archer Aqua" />
      <meta property="og:locale" content="en_US" />
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@ad_archer_" />
      <meta name="twitter:site" content="@ad_archer_" />
    </Helmet>
  );
}
