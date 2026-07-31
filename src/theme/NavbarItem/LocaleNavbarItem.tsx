import React from 'react';
import GlobalNavbarItem from '@theme/NavbarItem/DefaultNavbarItem';
import DocNavbarItem from '@theme/NavbarItem/DocNavbarItem';
import type { Props as DefaultNavbarItemProps } from '@theme/NavbarItem/DefaultNavbarItem';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 各导航项的多语言标签
const labels: Record<string, Record<string, string>> = {
  home: {
    en: 'Home',
    'zh-Hans': '首页',
    'zh-Hant': '首頁',
  },
  gettingStarted: {
    en: 'Getting Started',
    'zh-Hans': '快速开始',
    'zh-Hant': '快速開始',
  },
};

interface LocaleNavbarItemProps extends DefaultNavbarItemProps {
  labelKey: 'home' | 'gettingStarted';
  /** 如果是 doc 类型,提供 docId */
  docId?: string;
}

export default function LocaleNavbarItem({
  labelKey,
  docId,
  ...props
}: LocaleNavbarItemProps): JSX.Element {
  const {
    i18n: { currentLocale },
  } = useDocusaurusContext();
  const localizedLabel =
    labels[labelKey]?.[currentLocale] ?? labels[labelKey].en;

  // doc 类型:用 DocNavbarItem 渲染,并传入本地化 label
  if (docId) {
    return (
      <DocNavbarItem
        {...(props as any)}
        docId={docId}
        label={localizedLabel}
      />
    );
  }

  // 普通链接:用 DefaultNavbarItem
  return (
    <GlobalNavbarItem {...props} label={localizedLabel} />
  );
}
