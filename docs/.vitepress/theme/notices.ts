export type NoticeType = 'info' | 'warning' | 'danger'

export interface NoticeItem {
  type: NoticeType
  title: string
  lines: string[]
}

export type NoticesByItem = Record<string, NoticeItem[]>
export type NoticesByLocale = Record<string, NoticesByItem>

export const noticesByLocale: NoticesByLocale = {
  'en-US': {
    'Xdows-Security-4.1': [
      {
        type: 'warning',
        title: 'Outdated Version',
        lines: ['This version is outdated. It is recommended to view the latest <a href="/en-US/Xdows-Security-5/get-started">Xdows Security 5</a> version.'],
      },
      {
        type: 'info',
        title: 'Notice',
        lines: ['Xdows Security 4.1 is becoming IceZero AntiVirus'],
      },
    ],
    'Xdows-Security-4': [
      {
        type: 'warning',
        title: 'Outdated Version',
        lines: ['This version is outdated. It is recommended to view the latest <a href="/en-US/Xdows-Security-5/get-started">Xdows Security 5</a> version.'],
      },
    ],
  },
  'zh-HANS': {
    'Xdows-Security-4.1': [
      {
        type: 'warning',
        title: '注意',
        lines: ['该版本已过时。建议查看最新的 <a href="/zh-HANS/Xdows-Security-5/get-started">Xdows Security 5</a> 版本。'],
      },
      {
        type: 'info',
        title: '通知',
        lines: ['Xdows Security 4.1 正在成为 IceZero AntiVirus'],
      },
    ],
    'Xdows-Security-4': [
      {
        type: 'warning',
        title: '注意',
        lines: ['该版本已过时。建议查看最新的 <a href="/zh-HANS/Xdows-Security-5/get-started">Xdows Security 5</a> 版本。'],
      },
    ],
    'Xdows-Security': [
      {
        type: 'warning',
        title: '注意',
        lines: ['该版本已过时。建议查看最新的 <a href="/zh-HANS/Xdows-Security-5/get-started">Xdows Security 5</a> 版本。'],
      },
    ],
  },
  'zh-HANT': {
    'Xdows-Security-4.1': [
      {
        type: 'warning',
        title: '注意',
        lines: ['該版本已過時。建議查看最新的 <a href="/zh-HANT/Xdows-Security-5/get-started">Xdows Security 5</a> 版本。'],
      },
      {
        type: 'info',
        title: '通知',
        lines: ['Xdows Security 4.1 正在成為 IceZero AntiVirus'],
      },
    ],
    'Xdows-Security-4': [
      {
        type: 'warning',
        title: '注意',
        lines: ['該版本已過時。建議查看最新的 <a href="/zh-HANT/Xdows-Security-5/get-started">Xdows Security 5</a> 版本。'],
      },
    ],
  },
}

export function getItemNotices(locale: string, itemKey: string): NoticeItem[] {
  const localeMap = noticesByLocale[locale] ?? {}
  return localeMap[itemKey] ?? []
}
