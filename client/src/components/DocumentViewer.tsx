import KaTeXRenderer from './KaTeXRenderer';

interface DocumentViewerProps {
  content: string;
}

export default function DocumentViewer({ content }: DocumentViewerProps) {
  return (
    <div className="h-full overflow-auto p-6">
      <KaTeXRenderer 
        content={content} 
        className="text-gray-700 leading-relaxed text-lg"
      />
    </div>
  );
}