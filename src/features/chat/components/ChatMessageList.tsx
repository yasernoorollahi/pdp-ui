import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { ChatMessageItem } from './ChatMessageItem';
import styles from './ChatMessageList.module.css';

interface ChatMessageListProps {
  messages: ChatMessage[];
}

export const ChatMessageList = ({ messages }: ChatMessageListProps) => {
  const listRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    node.scrollTo({
      top: node.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  return (
    <section ref={listRef} className={styles.messageList} aria-live="polite">
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
    </section>
  );
};
