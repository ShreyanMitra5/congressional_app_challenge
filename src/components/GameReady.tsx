"use client";

import type { ReactNode } from "react";
import { Chip, IconButton, PrimaryButton, SpeechBubble, TextButton } from "@/components/ui";
import styles from "./GameReady.module.css";

interface GameReadyProps {
  gameNumber: 1 | 2 | 3;
  title: string;
  instructions: ReactNode;
  illustration: ReactNode;
  companion: ReactNode;
  encouragement: ReactNode;
  soundButton: ReactNode;
  onBack: () => void;
  onStart: () => void;
  onHearInstructions: () => void;
}

/** Instructions use normal flow; measured game layouts remain on their fixed canvas. */
export function GameReady({
  gameNumber,
  title,
  instructions,
  illustration,
  companion,
  encouragement,
  soundButton,
  onBack,
  onStart,
  onHearInstructions,
}: GameReadyProps) {
  return (
    <main className={styles.content}>
      <nav className={styles.navigation} aria-label="Game navigation">
        <IconButton icon="back" label="Back to Basecamp" onClick={onBack} />
        {soundButton}
      </nav>
      <header className={`${styles.heading} pop-in`}>
        <Chip>Game {gameNumber} of 3</Chip>
        <h1 className={`t-title-lg ${styles.title}`}>{title}</h1>
        <p className={`t-body ${styles.instructions}`}>{instructions}</p>
      </header>
      <div className={styles.illustration}>{illustration}</div>
      <div className={`${styles.guide} pop-in-2`}>
        <div className={styles.companion} aria-hidden>{companion}</div>
        <div className={styles.encouragement}>
          <SpeechBubble style={{ width: "100%", lineHeight: 1.4 }}>{encouragement}</SpeechBubble>
        </div>
      </div>
      <div className={`${styles.actions} pop-in-3`}>
        <PrimaryButton width="100%" onClick={onStart}>I&apos;m ready</PrimaryButton>
        <TextButton style={{ width: "100%", lineHeight: 1.4 }} onClick={onHearInstructions}>
          Hear the instructions
        </TextButton>
      </div>
    </main>
  );
}
