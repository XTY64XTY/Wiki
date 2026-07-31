import React from 'react';
import DocItemLayout from '@theme-original/DocItem/Layout';
import type { WrapperProps } from '@theme-original/DocItem/Layout';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import ProjectNotices from '@site/src/theme/ProjectNotices';

export default function DocItemLayoutWrapper(
  props: WrapperProps,
): JSX.Element {
  const { metadata } = useDoc();
  // Extract item key from the doc ID (e.g., "Xdows-Security-4.1/get-started" → "Xdows-Security-4.1")
  const itemKey = metadata.id.split('/')[0];

  return (
    <>
      {itemKey && <ProjectNotices item={itemKey} />}
      <DocItemLayout {...props} />
    </>
  );
}
