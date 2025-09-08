import React from 'react';
import '../styles/preview-list.css';

type Props = {
  children: React.ReactNode;
};

export const PreviewList: React.FC<Props> = ({ children }) => {
  return <div className="preview-list">{children}</div>;
};

export default PreviewList;

