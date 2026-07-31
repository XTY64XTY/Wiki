import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';

interface Feature {
  title: string;
  details: string;
  link: string;
  linkText: string;
}

interface LocaleContent {
  heroName: string;
  heroTagline: string;
  getStartedText: string;
  downloadText: string;
  features: Feature[];
}

const localeContent: Record<string, LocaleContent> = {
  en: {
    heroName: 'Xdows Software',
    heroTagline: 'Xdows Software Documentation',
    getStartedText: 'Get Started',
    downloadText: 'Download',
    features: [
      {
        title: 'Xdows Security 5',
        details:
          'Xdows Security 5 is an antivirus application built with WinUI3 and C#, fully open source under MIT License',
        link: '/Xdows-Security-5/get-started#Download',
        linkText: 'View Installation Guide',
      },
      {
        title: 'Xdows Security 4.1',
        details:
          'Xdows Security 4.1 is an antivirus application built with WinUI3 and C#',
        link: '/Xdows-Security-4.1/get-started#Download',
        linkText: 'View Installation Guide',
      },
      {
        title: 'Xdows Security 4.0',
        details:
          'Xdows Security 4.0 is an antivirus application based on Web technology',
        link: '/Xdows-Security-4/get-started#Download',
        linkText: 'View Installation Guide',
      },
      {
        title: 'Xdows Model',
        details: 'LightGBM-based scanning engine',
        link: '/Xdows-Model/get-started',
        linkText: 'View Model Documentation',
      },
    ],
  },
  'zh-Hans': {
    heroName: 'Xdows Software',
    heroTagline: '在这查看相关文档',
    getStartedText: '快速开始',
    downloadText: '立即下载',
    features: [
      {
        title: 'Xdows Security 5',
        details:
          '基于 WinUI3 + C# 技术构建的杀毒软件，完全开源并使用 MIT 协议',
        link: '/zh-Hans/Xdows-Security-5/get-started#Download',
        linkText: '查看下载安装教程',
      },
      {
        title: 'Xdows Security 4.1',
        details: '基于 WinUI3 + C# 技术构建的杀毒软件',
        link: '/zh-Hans/Xdows-Security-4.1/get-started#Download',
        linkText: '查看下载安装教程',
      },
      {
        title: 'Xdows Security 4.0',
        details: '基于 Web 技术构建的杀毒软件',
        link: '/zh-Hans/Xdows-Security-4/get-started#Download',
        linkText: '查看下载安装教程',
      },
      {
        title: 'Xdows Security 3.0',
        details: '基于内嵌 Web 技术的杀毒软件',
        link: '/zh-Hans/Xdows-Security/get-started#Download',
        linkText: '查看下载安装教程',
      },
      {
        title: 'Xdows Model',
        details: '基于 LightGBM 的扫描引擎',
        link: '/zh-Hans/Xdows-Model/get-started',
        linkText: '查看模型文档',
      },
    ],
  },
  'zh-Hant': {
    heroName: 'Xdows Software',
    heroTagline: '在這查看相關文檔',
    getStartedText: '快速開始',
    downloadText: '立即下載',
    features: [
      {
        title: 'Xdows Security 5',
        details:
          '基於 WinUI3 + C# 技術構建的防毒軟體，完全開源並使用 MIT 協議',
        link: '/zh-Hant/Xdows-Security-5/get-started#Download',
        linkText: '查看下載安裝教程',
      },
      {
        title: 'Xdows Security 4.1',
        details: '基於 WinUI3 + C# 技術構建的防毒軟體',
        link: '/zh-Hant/Xdows-Security-4.1/get-started',
        linkText: '查看下載安裝教程',
      },
      {
        title: 'Xdows Security 4.0',
        details: '基於 Web 技術構建的防毒軟體',
        link: '/zh-Hant/Xdows-Security-4/get-started#Download',
        linkText: '查看下載安裝教程',
      },
      {
        title: 'Xdows Model',
        details: '基於 LightGBM 的掃描引擎',
        link: '/zh-Hant/Xdows-Model/get-started',
        linkText: '查看模型文檔',
      },
    ],
  },
};

function HomepageFeatures({ features }: { features: Feature[] }): JSX.Element {
  return (
    <section className="features">
      <div className="container">
        <div className="row">
          {features.map((feat, idx) => (
            <div key={idx} className={clsx('col col--4 margin-vert--md')}>
              <div className="card">
                <div className="card__body">
                  <h3>{feat.title}</h3>
                  <p>{feat.details}</p>
                  <Link to={feat.link}>{feat.linkText}</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {
    i18n: { currentLocale },
  } = useDocusaurusContext();
  const content = localeContent[currentLocale] || localeContent.en;
  const logoUrl = useBaseUrl('/logo.ico');

  return (
    <Layout title={content.heroName} description={content.heroTagline}>
      <main>
        <div className="hero text--center padding-vert--xl">
        <div className="container">
          <img
            src={logoUrl}
            alt="Xdows Software"
            width="120"
            height="120"
            style={{ marginBottom: '1rem' }}
          />
          <h1 className="hero__title">{content.heroName}</h1>
          <p className="hero__subtitle">{content.heroTagline}</p>
          <div className="margin-top--lg">
            <Link
              className="button button--primary button--lg margin-horiz--sm"
              to={
                currentLocale === 'en'
                  ? '/Xdows-Security-5/get-started'
                  : `/${currentLocale}/Xdows-Security-5/get-started`
              }
            >
              {content.getStartedText}
            </Link>
            <Link
              className="button button--secondary button--lg margin-horiz--sm"
              to={
                currentLocale === 'en'
                  ? '/Xdows-Security-5/get-started#Download'
                  : `/${currentLocale}/Xdows-Security-5/get-started#Download`
              }
            >
              {content.downloadText}
            </Link>
          </div>
        </div>
      </div>
      <HomepageFeatures features={content.features} />
    </main>
    </Layout>
  );
}
