interface Props {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: Date;
}

function formatTime(d?: Date) {
  if (!d) return null;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function MessageBubble({ content, role, timestamp }: Props) {
  const isUser = role === 'user';
  const time = formatTime(timestamp);

  return (
    <div className={`flex flex-col animate-slide-up ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className="px-[18px] py-[14px] text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{
          maxWidth: '75%',
          background: isUser ? '#b8ff4f' : '#1a2a4a',
          color: isUser ? '#0B1120' : '#ffffff',
          fontWeight: isUser ? 500 : 400,
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        }}
      >
        {content}
      </div>

      {time && (
        <span className="text-[10px] mt-1 px-1" style={{ color: '#8892a4' }}>
          {time}
        </span>
      )}
    </div>
  );
}
