import type { SidebarItem } from '@docusaurus/plugin-content-docs';

/**
 * Sidebar definitions for each locale.
 * Structure mirrors the original VitePress sidebar config.
 * The sidebarItemsGenerator filters these to only include docs that exist per locale.
 */
export const sidebarData: Record<string, SidebarItem[]> = {
  en: [
    {
      type: 'category',
      label: 'Xdows Security 5',
      collapsed: false,
      link: { type: 'doc', id: 'Xdows-Security-5/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-5/get-started', label: 'Getting Started' },
        { type: 'doc', id: 'Xdows-Security-5/protection', label: 'Protection Capabilities' },
        { type: 'doc', id: 'Xdows-Security-5/driver-environment', label: 'Driver Environment' },
        { type: 'doc', id: 'Xdows-Security-5/build', label: 'Build and Installation' },
        { type: 'doc', id: 'Xdows-Security-5/troubleshooting', label: 'Troubleshooting' },
        { type: 'doc', id: 'Xdows-Security-5/update', label: 'Changelog' },
        { type: 'doc', id: 'Xdows-Security-5/Xdows-Tools/get-started', label: 'Xdows Tools' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Security 4.1',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Security-4.1/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-4.1/get-started', label: 'Getting Started' },
        { type: 'doc', id: 'Xdows-Security-4.1/update', label: 'Changelog' },
        { type: 'doc', id: 'Xdows-Security-4.1/Xdows-Tools/get-started', label: 'Xdows Tools' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Security 4.0',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Security-4/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-4/get-started', label: 'Getting Started' },
        {
          type: 'category',
          label: 'Client',
          collapsed: true,
          link: { type: 'doc', id: 'Xdows-Security-4/Client/Windows' },
          items: [
            { type: 'doc', id: 'Xdows-Security-4/Client/Windows', label: 'Windows' },
          ],
        },
        {
          type: 'category',
          label: 'Xdows Tools',
          collapsed: false,
          link: { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/get-started' },
          items: [
            { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/get-started', label: 'Getting Started' },
            {
              type: 'category',
              label: 'Plugins',
              collapsed: false,
              link: { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/get-started' },
              items: [
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/get-started', label: 'Getting Started' },
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/Packages', label: 'Making Packages' },
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/Main.dll', label: 'Main.dll' },
              ],
            },
          ],
        },
        { type: 'doc', id: 'Xdows-Security-4/update', label: 'Changelog' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Model',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Model/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Model/get-started', label: 'Getting Started' },
      ],
    },
  ],

  'zh-Hans': [
    {
      type: 'category',
      label: 'Xdows Security 5',
      collapsed: false,
      link: { type: 'doc', id: 'Xdows-Security-5/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-5/get-started', label: '快速开始' },
        { type: 'doc', id: 'Xdows-Security-5/protection', label: '保护能力' },
        { type: 'doc', id: 'Xdows-Security-5/driver-environment', label: '驱动环境检测' },
        { type: 'doc', id: 'Xdows-Security-5/build', label: '构建与安装' },
        { type: 'doc', id: 'Xdows-Security-5/troubleshooting', label: '故障排查' },
        { type: 'doc', id: 'Xdows-Security-5/update', label: '更新日志' },
        { type: 'doc', id: 'Xdows-Security-5/Xdows-Tools/get-started', label: 'Xdows Tools' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Security 4.1',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Security-4.1/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-4.1/get-started', label: '快速开始' },
        { type: 'doc', id: 'Xdows-Security-4.1/update', label: '更新日志' },
        { type: 'doc', id: 'Xdows-Security-4.1/Xdows-Tools/get-started', label: 'Xdows Tools' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Security 4.0',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Security-4/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-4/get-started', label: '快速开始' },
        {
          type: 'category',
          label: '客户端',
          collapsed: true,
          link: { type: 'doc', id: 'Xdows-Security-4/Client/Windows' },
          items: [
            { type: 'doc', id: 'Xdows-Security-4/Client/Windows', label: 'Windows' },
          ],
        },
        {
          type: 'category',
          label: 'Xdows Tools',
          collapsed: false,
          link: { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/get-started' },
          items: [
            { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/get-started', label: '快速开始' },
            {
              type: 'category',
              label: '插件系统',
              collapsed: false,
              link: { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/get-started' },
              items: [
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/get-started', label: '快速开始' },
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/Packages', label: '打包插件' },
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/Main.dll', label: 'Main.dll' },
              ],
            },
          ],
        },
        { type: 'doc', id: 'Xdows-Security-4/update', label: '更新日志' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Security 3.0',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Security/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security/get-started', label: '快速开始' },
        { type: 'doc', id: 'Xdows-Security/system', label: '系统要求' },
        { type: 'doc', id: 'Xdows-Security/home-feature', label: '主页功能' },
        { type: 'doc', id: 'Xdows-Security/security-feature', label: '杀毒功能' },
        { type: 'doc', id: 'Xdows-Security/tools-feature', label: 'Xdows Tools' },
        { type: 'doc', id: 'Xdows-Security/settings-feature', label: '设置功能' },
        { type: 'doc', id: 'Xdows-Security/version', label: '版本计划' },
        { type: 'doc', id: 'Xdows-Security/help', label: '常见问题' },
        { type: 'doc', id: 'Xdows-Security/update', label: '更新日志' },
        { type: 'doc', id: 'Xdows-Security/code-authorization', label: '代码授权' },
        { type: 'doc', id: 'Xdows-Security/Open-Source', label: '开源说明' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Model',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Model/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Model/get-started', label: '快速开始' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Cloud',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Cloud/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Cloud/get-started', label: '快速开始' },
      ],
    },
    {
      type: 'category',
      label: '文件中转站',
      collapsed: true,
      link: { type: 'doc', id: 'Files/Home' },
      items: [
        { type: 'doc', id: 'Files/Home', label: '暂无相关文档' },
      ],
    },
    {
      type: 'category',
      label: 'NTOS 系统',
      collapsed: true,
      link: { type: 'doc', id: 'NTOS/Home' },
      items: [
        { type: 'doc', id: 'NTOS/Home', label: '暂无相关文档' },
      ],
    },
    {
      type: 'category',
      label: 'Winget++',
      collapsed: true,
      link: { type: 'doc', id: 'Winget-Plus/Home' },
      items: [
        { type: 'doc', id: 'Winget-Plus/Home', label: '暂无相关文档' },
      ],
    },
  ],

  'zh-Hant': [
    {
      type: 'category',
      label: 'Xdows Security 5',
      collapsed: false,
      link: { type: 'doc', id: 'Xdows-Security-5/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-5/get-started', label: '快速開始' },
        { type: 'doc', id: 'Xdows-Security-5/protection', label: '防護能力' },
        { type: 'doc', id: 'Xdows-Security-5/driver-environment', label: '驅動程式環境檢測' },
        { type: 'doc', id: 'Xdows-Security-5/build', label: '建置與安裝' },
        { type: 'doc', id: 'Xdows-Security-5/troubleshooting', label: '疑難排解' },
        { type: 'doc', id: 'Xdows-Security-5/update', label: '更新日誌' },
        { type: 'doc', id: 'Xdows-Security-5/Xdows-Tools/get-started', label: 'Xdows Tools' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Security 4.1',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Security-4.1/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-4.1/get-started', label: '快速開始' },
        { type: 'doc', id: 'Xdows-Security-4.1/update', label: '更新日誌' },
        { type: 'doc', id: 'Xdows-Security-4.1/Xdows-Tools/get-started', label: 'Xdows Tools' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Security 4.0',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Security-4/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Security-4/get-started', label: '快速開始' },
        {
          type: 'category',
          label: '客戶端',
          collapsed: true,
          link: { type: 'doc', id: 'Xdows-Security-4/Client/Windows' },
          items: [
            { type: 'doc', id: 'Xdows-Security-4/Client/Windows', label: 'Windows' },
          ],
        },
        {
          type: 'category',
          label: 'Xdows Tools',
          collapsed: false,
          link: { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/get-started' },
          items: [
            { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/get-started', label: '快速開始' },
            {
              type: 'category',
              label: '外掛',
              collapsed: false,
              link: { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/get-started' },
              items: [
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/get-started', label: '快速開始' },
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/Packages', label: '建立外掛套件' },
                { type: 'doc', id: 'Xdows-Security-4/Xdows-Tools/Plugins/Main.dll', label: 'Main.dll' },
              ],
            },
          ],
        },
        { type: 'doc', id: 'Xdows-Security-4/update', label: '更新日誌' },
      ],
    },
    {
      type: 'category',
      label: 'Xdows Model',
      collapsed: true,
      link: { type: 'doc', id: 'Xdows-Model/get-started' },
      items: [
        { type: 'doc', id: 'Xdows-Model/get-started', label: '快速開始' },
      ],
    },
  ],
};

/**
 * Recursively filter sidebar items to only include docs that exist in the current locale.
 */
export function filterSidebarItems(
  items: SidebarItem[],
  docIds: Set<string>,
): SidebarItem[] {
  return items
    .map((item) => {
      if (item.type === 'doc') {
        return docIds.has(item.id) ? item : null;
      }
      if (item.type === 'category') {
        const filteredItems = filterSidebarItems(
          item.items as SidebarItem[],
          docIds,
        );
        if (filteredItems.length === 0) return null;
        return { ...item, items: filteredItems };
      }
      return item;
    })
    .filter((item): item is SidebarItem => item !== null);
}

/**
 * Detect locale from doc source paths.
 */
export function detectLocale(docs: Array<{ source?: string }>): string {
  const firstSource = docs[0]?.source || '';
  if (firstSource.includes('i18n/zh-Hans')) return 'zh-Hans';
  if (firstSource.includes('i18n/zh-Hant')) return 'zh-Hant';
  return 'en';
}
