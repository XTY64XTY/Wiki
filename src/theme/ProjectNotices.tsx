import React from 'react';
import Admonition from '@theme/Admonition';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { getItemNotices, type NoticeType } from './notices';

interface ProjectNoticesProps {
  item: string;
}

const noticeTypeToAdmonition: Record<NoticeType, string> = {
  info: 'tip',
  warning: 'caution',
  danger: 'danger',
};

export default function ProjectNotices({
  item,
}: ProjectNoticesProps): JSX.Element | null {
  const {
    i18n: { currentLocale },
  } = useDocusaurusContext();
  const notices = getItemNotices(currentLocale, item);

  if (notices.length === 0) return null;

  return (
    <div className="project-notices">
      {notices.map((n, idx) => (
        <Admonition
          key={idx}
          type={noticeTypeToAdmonition[n.type] as 'tip' | 'caution' | 'danger'}
          title={n.title}
        >
          {n.lines.map((line, li) => (
            <p key={li} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </Admonition>
      ))}
    </div>
  );
}
