import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { sidebarData, filterSidebarItems, detectLocale } from './sidebar-data';

const SITE_URL = 'https://docs.xiguastudio.top/';
const EDIT_REPO = 'https://github.com/XTY64XTY/Wiki/edit/main';

const config: Config = {
  title: 'Xdows Software',
  tagline: 'Xdows Security 是由 Xdows Software 开发，使用自主研发的高精准度模型 Xdows Model 提供扫描支持',
  favicon: 'logo.ico',
  url: SITE_URL,
  baseUrl: '/',

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',
  onDuplicateRoutes: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans', 'zh-Hant'],
    localeConfigs: {
      en: {
        label: 'English',
        htmlLang: 'en-US',
      },
      'zh-Hans': {
        label: '简体中文',
        htmlLang: 'zh-HANS',
      },
      'zh-Hant': {
        label: '繁體中文',
        htmlLang: 'zh-HANT',
      },
    },
  },

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content:
          'Xdows Security 是由 Xdows Software 开发，使用自主研发的高精准度模型 Xdows Model 提供扫描支持',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content:
          'Xdows, Xdows Software, Xdows Security, Xdows Tools, 安全软件, 插件, 文档',
      },
    },
    {
      tagName: 'meta',
      attributes: { name: 'robots', content: 'index,follow' },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:title', content: 'Xdows Software' },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content:
          'Xdows Security 是由 Xdows Software 开发，使用自主研发的高精准度模型 Xdows Model 提供扫描支持',
      },
    },
    { tagName: 'meta', attributes: { property: 'og:type', content: 'website' } },
    { tagName: 'meta', attributes: { property: 'og:url', content: SITE_URL } },
    { tagName: 'meta', attributes: { property: 'og:locale', content: 'zh_CN' } },
    {
      tagName: 'meta',
      attributes: { property: 'og:locale:alternate', content: 'en_US' },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:locale:alternate', content: 'zh_Hant' },
    },
    { tagName: 'meta', attributes: { name: 'twitter:card', content: 'summary' } },
    {
      tagName: 'meta',
      attributes: { name: 'twitter:title', content: 'Xdows Software' },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:description',
        content:
          'Xdows Security 是由 Xdows Software 开发，使用自主研发的高精准度模型 Xdows Model 提供扫描支持',
      },
    },
    {
      tagName: 'link',
      attributes: { rel: 'canonical', href: SITE_URL },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
          editUrl: ({ locale, docPath }) => {
            if (locale === 'en') {
              return `${EDIT_REPO}/docs/${docPath}`;
            }
            const localeDir =
              locale === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant';
            return `${EDIT_REPO}/i18n/${localeDir}/docusaurus-plugin-content-docs/current/${docPath}`;
          },
          sidebarItemsGenerator: async (args) => {
            const { docs } = args;
            const locale = detectLocale(docs);
            const sidebar = sidebarData[locale] || sidebarData.en;
            const docIds = new Set(
              docs.map((d: { id: string }) => d.id),
            );
            return filterSidebarItems(sidebar, docIds);
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } as Preset.ThemeConfig,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Xdows Software',
      logo: {
        alt: 'Xdows Software Logo',
        src: 'logo.ico',
      },
      items: [
        {
          type: 'custom-locale-navbar-item',
          position: 'left',
          labelKey: 'home',
          to: '/',
          activeBaseRegex: '^/(zh-Hans|zh-Hant|en)?/?$',
        },
        {
          type: 'custom-locale-navbar-item',
          position: 'left',
          labelKey: 'gettingStarted',
          docId: 'Xdows-Security-5/get-started',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/XTY64XTY',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Xdows Software All Rights Reserved`,
    },
    prism: {
      // Fenced code blocks keep the Windows Terminal palette in both modes.
      theme: prismThemes.vsDark,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['csharp', 'cpp', 'python', 'json', 'bash'],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
  } as Preset.ThemeConfig,

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en', 'zh'],
        indexDocs: true,
        indexPages: true,
      },
    ],
  ],
};

export default config;
