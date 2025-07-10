interface DocumentViewerProps {
  content: string;
  title: string;
}

export default function DocumentViewer({ content, title }: DocumentViewerProps) {
  return (
    <div className="w-full h-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6 h-96 overflow-y-auto">
        <div 
          className="whitespace-pre-wrap font-serif text-base leading-relaxed text-gray-800"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            lineHeight: '1.8',
            textAlign: 'justify'
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}