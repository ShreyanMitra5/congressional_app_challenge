"use client";

import { RewardIcon } from "@/components/art/rewards";
import { At, Stage } from "@/components/Stage";
import { BigCircleButton, Chip, LockNote, OutlineButton, Pips, PrimaryButton, RewardCard, SpeechBubble } from "@/components/ui";

export default function Page() {
  return (
    <Stage>
      <At x={0} y={40} w={390} style={{ display: "flex", justifyContent: "center" }}>
        <Pips filled={4} />
      </At>
      <At x={25} y={80}>
        <RewardCard icon={<RewardIcon id="lantern" size={64} />} label="New for your Basecamp" name="A little lantern" />
      </At>
      <At x={25} y={200}>
        <RewardCard icon={<RewardIcon id="stone" size={64} />} label="New for your Basecamp" name="A stepping-stone" />
      </At>
      <At x={25} y={320}>
        <RewardCard icon={<RewardIcon id="lanternString" size={64} />} label="New for your Basecamp" name="A paper lantern string" />
      </At>
      <At x={0} y={448} w={390}>
        <LockNote />
      </At>
      <At x={30} y={490}>
        <SpeechBubble width={230}>Ready? We&apos;ll practice twice first. Those don&apos;t count!</SpeechBubble>
      </At>
      <At x={280} y={500}>
        <Chip>Game 1 of 3</Chip>
      </At>
      <At x={55} y={600} w={280}>
        <PrimaryButton>I&apos;m ready</PrimaryButton>
      </At>
      <At x={55} y={670} w={280}>
        <OutlineButton>Take a break</OutlineButton>
      </At>
      <At x={40} y={740} w={120} h={120}>
        <BigCircleButton label="Catch" glowing={false} size={100} />
      </At>
      <At x={230} y={740} w={120} h={120}>
        <BigCircleButton label="Catch" glowing size={100} />
      </At>
    </Stage>
  );
}
