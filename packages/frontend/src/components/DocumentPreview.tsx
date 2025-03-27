'use client';
import React from 'react';
import { useState } from 'react';
import { FileText, Wand, Clipboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

const DocumentPreview = () => {
  const [previewContent, setPreviewContent] = useState('');
  const t = useTranslations('PrepareDocuments');
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h4 className="mb-3 text-xl font-semibold">{t('document-preview')}</h4>
      <div
        className="border p-5 min-h-[750px] rounded-md min-h-auto flex items-center justify-center text-gray-500"
        id="letterPreview"
      >
        {previewContent ? (
          <p>{previewContent}</p>
        ) : (
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto" />
            <p className="mt-3">{t('doc-preview-intro')}</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="flex items-center gap-2 bg-blue-primary text-white px-4 py-2 rounded-md hover:bg-blue-800"
          id="generateBtn"
        >
          <Wand className="w-5 h-5" /> {t('gen-doc')}
        </button>
        <button
          className="flex items-center gap-2 border border-gray-400 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100"
          id="copyBtn"
        >
          <Clipboard className="w-5 h-5" /> {t('copy')}
        </button>
      </div>
    </div>
  );
};

export default DocumentPreview;
