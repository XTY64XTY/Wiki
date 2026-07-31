import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

interface LinkCardProps {
  url: string;
  title: string;
  description: string;
  logo: string;
}

export default function LinkCard({
  url,
  title,
  description,
  logo,
}: LinkCardProps): JSX.Element {
  const logoUrl = useBaseUrl(logo);
  return (
    <div className="linkcard">
      <Link to={url}>
        <p className="description">
          {title}
          <br />
          <span>{description}</span>
        </p>
        <div className="logo">
          <img alt="logo" width={70} height={70} src={logoUrl} />
        </div>
      </Link>
    </div>
  );
}
