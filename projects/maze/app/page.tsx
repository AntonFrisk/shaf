"use client";

import { useState } from "react";
import Game from "@/components/Game";
import Guide from "@/components/Guide";

export default function Home() {
  const [playing, setPlaying] = useState(false);

  return (
    <main>
      {playing ? <Game onBack={() => setPlaying(false)} /> : <Guide onPlay={() => setPlaying(true)} />}
    </main>
  );
}
